import puppeteer, { Browser, Page } from "puppeteer";  
import fs from "fs";
import model from "./model-relaciones.js"
import requestBatchProcess from "./request-batch.js";


/**
 * Funcion que es llamada para el inicio de la recoleccion de las relaciones.
 */
async function startingGetRelations(){
    const browser = await createBrowser();
    const page = await browser.newPage();
    await page.setViewport({width:1920,height:1080});
    for (let index = 0; index < 1; index++) {
        await page.goto(model[index].ruta);
        await page.reload();
        await timer();
        let btn;
        do{
            btn = await page.$('a[title="Consulta de tesis"]');
        }while(!btn);
        await timer(1000);
        await btn.click();
        await timer();
        let segundos = await page.$('a[title="Totales"]');
        if(segundos){
            await segundos.click();
        }
        await timer();
        await getRelaciones(page, model[index].materia);
    }
}

/**
 * Funcion asincrona que lo que hace es regresar un arreglo de json que contienen las tesis, asi como informacion relevante de la tesis.
 * @param {int} iteraciones - El numero de tesis que debe recorrer, debe ser calculado previamente, no tiene valor por defecto
 * @param {Page} page - Debe enviarse la pagina para poder acceder a los elementos HTML.
 * @returns {Array} -Arreglo de JSON obtenidos de las iteraciones.
 */
async function getRelaciones(page, materia) {
    const total = await page.$eval('.dataTables_info',elem => elem.innerText);
    let tot = total.match(/([\d])+/g)[2];
    tot = parseInt(tot);
    await page.evaluate(()=> {
        document.querySelector('tr[class="ng-scope"]').firstElementChild.click();
        document.querySelector('.icon-marcar-todo').parentElement.click();
        document.querySelector('.icon-visualizar').parentElement.click();
    });
    await timer();
    let arr = [];
    for (let index = 0; index < 100; index++) {
        const totalArticulos = await page.evaluate(()=> document.querySelector('h3 > small[class="ng-binding"]').innerText.match(/([\d])+/g)[1]);
        if(!totalArticulos)continue;
        if(index == 0)await page.evaluate(()=> document.querySelectorAll('.icon-marcar-todo')[1].parentElement.click());
        let pivote = 0;
        let relaciones = [];
        do{
            const currentElement = await page.$$('table[template-pagination="custom/pager/articulos"]  td.bg-gray-strong, td.font-bold');
            if(!currentElement)continue;
            const stringElement = await page.$$eval('table[template-pagination="custom/pager/articulos"]  td.bg-gray-strong, td.font-bold',
            e => e.map(e => e.textContent.split('.')[0].trim()));
            for (let element = 0; element < currentElement.length; element++) {
                await currentElement[element].click();
                await timer();
                const documento = await page.evaluate(() => document.querySelector('span[ng-show="vm.currentItem.sLey.length"]').innerText);
                relaciones.push({documento,'relaciones':stringElement[element]});
            }
            pivote += currentElement.length;
            if(pivote < totalArticulos){
                await page.evaluate(()=> document.querySelectorAll('.icon-derecha')[1].parentElement.click());
                await timer();
            }
        }while(pivote < totalArticulos);
        const tesis= await page.evaluate(() => document.querySelector('.mCSB_container > b').nextSibling.textContent);
        arr.push({relaciones,'registro_digital':tesis.trim(),index});
    await page.evaluate(()=>document.querySelector('.icon-derecha').parentElement.click());
    await timer();
    await fs.promises.writeFile(`relaciones-${materia}.json`,JSON.stringify(arr),null,3);
    }
}
/*
body que se hizo para normalizar la funcion de promesa en el traslado entre paginas, por defecto 3s.
 * @param {int} time 
 */
async function timer(time = 3000){
    await new Promise((resolve) => setTimeout(resolve,time));  
}

/**
 * Funcion que se encarga de crear el navegador el cual se usara para hacer el barrido de la informacion
 * @returns {Browser} funcion que regresa la instancia del navegador recien creado.
 */
async function createBrowser(){
    return await puppeteer.launch({headless:'new',slowMo:300});
}

async function startRequest(){
    let contenido = await fs.promises.readFile('relaciones-Fiscal.json');
    const response = await requestBatchProcess(JSON.parse(contenido));
    if(response.status == 200){
        console.log('La informacion llego correctamente');
    }
}

startingGetRelations();
startRequest();