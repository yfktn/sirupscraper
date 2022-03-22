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
        maxPage = 2, // -1 for unlimited
        delay = 1500,
        randomStr = (Math.random() + 1).toString(36).substring(7),
        currentFileName = 'sirup-penyedia-' + randomStr,
        data = [];

    while(keepCrawling) {
        try {
            await waiterAndTool.waitForProcessFinished(page);
            await waitTillHTMLRendered.waitTillHTMLRendered(page, { querySelector: "table#tblLelangLama" });
            await waiterAndTool.waitForPagination(page);
            await waiterAndTool.waitForPaginationOke(page, currentPage)
                .then(() => console.log(currentPage));
        } catch(error) {
            console.error('Gagal melakukan penelusuran halaman: ' + currentPage + "\n" + error);
            keepCrawling = false;
            break; // keluar!
        }
        // const data = await page.evaluate(() => {
        //     const rupTable = Array.from(document.querySelectorAll('table#tblLelangLama tbody tr'));
        //     return rupTable.map((row) => {
        //         const columns = Array.from(row.querySelectorAll('td'));

        //         return {
        //             satker: columns[1].innerText,
        //             nama_paket: columns[2].innerText,
        //             pagu: columns[3].innerText.replace(/[^0-9,]/g, ''),
        //             metode: columns[4].innerText,
        //             sumber_dana: columns[5].innerText.trim(),
        //             kode_rup: columns[6].innerText.trim(),
        //             waktu_pemilihan: columns[7].innerText.trim()
        //         };

        //     });
        // });
        
        // get link to opening dialog windows, click to open and read the content
        const links = page.$$('table#tblLelangLama tbody tr td:nth-child(3) a');
        data = []; // init first
        for(const link in links) {
            await link.click();
            await waitTillHTMLRendered.waitTillHTMLRendered(page, { querySelector: "div#myModal" });
            const retd = await page.evaluate(() => {
                // Only chose the main table of div#detil and ignore another table inside it!
                const detailTableRows = Array.from(document.querySelectorAll('div#detil > table > tbody > tr'));
                let dataInPage = {};
                detailTableRows.forEach((row) => {
                    switch(row.querySelector('td:nth-child(1)').innerText.toLowerCase()) {
                        case 'kode rup': dataInPage['kode_rup'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'nama paket': dataInPage['nama_paket'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'nama klpd': dataInPage['nama_klpd'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'satuan kerja': dataInPage['satuan_kerja'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'tahun anggaran': dataInPage['tahun_anggaran'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'volume pekerjaan': dataInPage['volume_pekerjaan'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'uraian pekerjaan': dataInPage['uraian_pekerjaan'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'spesifikasi pekerjaan': dataInPage['spesifikasi_pekerjaan'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'produk dalam negeri': dataInPage['produk_dalam_negeri'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'usaha kecil/koperasi': dataInPage['usaha_kecil_koperasi'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'pra dipa / dpa': dataInPage['pra_dipa_dpa'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'jenis pengadaan': dataInPage['jenis_pengadaan'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'jenis pengadaan': dataInPage['jenis_pengadaan'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'total pagu': dataInPage['total_pagu'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'metode pemilihan': dataInPage['metode_pemilihan'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'tanggal perbarui paket': dataInPage['tanggal_perbaharui_paket'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
                        case 'pemanfaatan barang/jasa':
                            tableDt = row.querySelectorAll('td:nth-child(2) table tbody tr:nth-child(2) td');
                            dataInPage['pemanfaatan_mulai'] = tableDt[0].innerText;
                            dataInPage['pemanfaatan_akhir'] = tableDt[1].innerText;
                            break;
                        case 'jadwal pelaksanaan kontrak':
                            tableDt = row.querySelectorAll('td:nth-child(2) table tbody tr:nth-child(2) td');
                            dataInPage['kontrak_mulai'] = tableDt[0].innerText;
                            dataInPage['kontrak_akhir'] = tableDt[1].innerText;
                            break;
                        case 'jadwal pemilihan penyedia':
                            tableDt = row.querySelectorAll('td:nth-child(2) table tbody tr:nth-child(2) td');
                            dataInPage['pemilihan_mulai'] = tableDt[0].innerText;
                            dataInPage['pemilihan_akhir'] = tableDt[1].innerText;
                            break;
                    }
                })
                return dataInPage;
                // return {
                //     kode_rup: detailTableRows[0].querySelector('td:nth-child(2)').innerText,
                //     nama_paket: detailTableRows[1].querySelector('td:nth-child(2)').innerText,
                //     nama_klpd: detailTableRows[2].querySelector('td:nth-child(2)').innerText,
                //     satker: detailTableRows[3].querySelector('td:nth-child(2)').innerText,
                //     tahun_anggaran: detailTableRows[4].querySelector('td:nth-child(2)').innerText,
                //     volume_pekerjaan: detailTableRows[8].querySelector('td:nth-child(2)').innerText,
                //     uraian_pekerjaan: detailTableRows[9].querySelector('td:nth-child(2)').innerText,
                //     spesifikasi_pekerjaan: detailTableRows[10].querySelector('td:nth-child(2)').innerText,
                //     produk_dalam_negeri: detailTableRows[11].querySelector('td:nth-child(2)').innerText,
                //     usaha_kecil_koperasi: detailTableRows[12].querySelector('td:nth-child(2)').innerText,

                // }
            });
            data.push(retd);
        }


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
