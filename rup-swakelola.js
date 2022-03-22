const puppeteer = require('puppeteer');
const fs = require("fs/promises");
const waiterAndTool = require("./waiterAndTool");
const waitTillHTMLRendered = require("./waitTillHTMLRendered");

const url = process.argv[2];
if(!url) {
    throw "URL untuk mendapatkan halaman awal SiRUP swakelola dari sirup.lkpp.go.id belum ditentukan!";
}

async function run(halamanUtama) {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    page.on('console', (msg) => console.log('PAGE_LOG:', msg.text()));
    await page.goto(halamanUtama, {waitUntil: ['networkidle2', 'domcontentloaded']});
    
    // first page then ... 
    await waiterAndTool.waitForProcessFinished(page);
    await waiterAndTool.selectItemsCountTo100(page);

    let keepCrawling = true, 
        currentPage = 1,
        maxPage = -1, // -1 for unlimited
        delay = 1500,
        randomStr = (Math.random() + 1).toString(36).substring(7),
        currentFileName = 'sirup-swakelola-' + randomStr ;

    while(keepCrawling) {
        try {
            await waiterAndTool.waitForProcessFinished(page);
            await waitTillHTMLRendered.waitTillHTMLRendered(page, { querySelector: "div#result" });
            await waiterAndTool.waitForPagination(page);
            await waiterAndTool.waitForPaginationOke(page, currentPage)
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
                    sumber_dana: columns[4].innerText.trim(),
                    kode_rup: columns[5].innerText.trim(),
                    waktu_pemilihan: columns[6].innerText.trim(),
                    kegiatan: columns[7].innerText.trim()
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
            await waiterAndTool.clickNextPage(page);
        }
    }

    await browser.close();
}

run(url);
