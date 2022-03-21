const puppeteer = require('puppeteer');
// const fs = require("fs/promises");

const url = process.argv[2];
if(!url) {
    throw "URL untuk mendapatkan halaman awal SiRUP swakelola dari sirup.lkpp.go.id belum ditentukan!";
}

async function waitForAjaxTableRendered(page, tableMaxCnt = 100) {
    // next
}

async function waitForProcessFinished(page) {
    return page.waitForSelector('div#tblLelangLama_processing', {
        visible: false,
    });
}

async function selectItemsCountTo100(page) {
    return page.select('select.form-control.input-sm', '100')
}

async function run(halamanUtama) {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await page.goto(halamanUtama, {waitUntil: ['networkidle2', 'domcontentloaded']});
    
    // first page then ... 
    await waitForProcessFinished(page);
    await selectItemsCountTo100(page);
    await waitForProcessFinished(page);

    page.on('console', (msg) => console.log('PAGE_LOG:', msg.text()));

    await page.screenshot({
        path: 'fullsirup.lkpp.go.id.png',
        fullPage: true
    });

    await browser.close();
}

run(url);
