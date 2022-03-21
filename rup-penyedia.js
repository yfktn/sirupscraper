const puppeteer = require('puppeteer');
const fs = require("fs/promises");

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

async function waitForPagination(page) {
    return page.waitForSelector('ul.pagination li', {
        visible: false,
    });
}

async function waitForPaginationOke(page, pageToCheck) {
    return page.waitForFunction("document.querySelector('li.paginate_button.active a').innerText == '" + pageToCheck + "'");
}

async function clickNextPage(page) {
    return page.click('li#tblLelangLama_next a');
}

async function selectItemsCountTo100(page) {
    return page.select('select.form-control.input-sm', '100')
}

async function run(halamanUtama) {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    page.on('console', (msg) => console.log('PAGE_LOG:', msg.text()));
    await page.goto(halamanUtama, {waitUntil: ['networkidle2', 'domcontentloaded']});
    
    // first page then ... 
    await waitForProcessFinished(page);
    await selectItemsCountTo100(page);

    let keepCrawling = true, 
        currentPage = 1,
        maxPage = -1, // -1 for unlimited
        delay = 1500,
        randomStr = (Math.random() + 1).toString(36).substring(7),
        currentFileName = 'sirup-penyedia-' + randomStr ;

    while(keepCrawling) {
        try {
            await waitForProcessFinished(page);
            await waitForPagination(page);
            await waitForPaginationOke(page, currentPage)
                .then(() => console.log(currentPage));
        } catch(error) {
            console.error('Gagal melakukan penelusuran halaman: ' + currentPage + "\n" + error);
            keepCrawling = false;
            break; // keluar!
        }
        const data = await page.evaluate(() => {
            const rupTable = Array.from(document.querySelectorAll('table#tblLelangLama tbody tr'));
            return rupTable.map((row) => {
                const columns = Array.from(row.querySelectorAll('td'));

                return {
                    satker: columns[1].innerText,
                    nama_paket: columns[2].innerText,
                    pagu: columns[3].innerText.replace(/[^0-9,]/g, ''),
                    metode: columns[4].innerText,
                    sumber_dana: columns[5].innerText.trim(),
                    kode_rup: columns[6].innerText.trim(),
                    waktu_pemilihan: columns[7].innerText.trim()
                };

            });
        });
        // save our data
        const pageStr = ('' + currentPage).padStart(4, '0');
        await fs.writeFile(currentFileName + '-' + pageStr + '.db', JSON.stringify(data));
        // next button "Selanjutnya" exist if it doesn't in disabled state!
        const isNextButtonExist = await page.evaluate(() => document.querySelector('li#tblLelangLama_next.disabled') == null);
        if(!isNextButtonExist) {
            keepCrawling = false;
        } else if(maxPage > 0 && currentPage >= maxPage) {
            keepCrawling = false;
        } else {
            currentPage++;
            page.waitForTimeout(delay);
            await clickNextPage(page);
        }
    }

    await browser.close();
}

run(url);
