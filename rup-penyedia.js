const puppeteer = require('puppeteer');
const fs = require("fs/promises");
const waiterAndTool = require("./waiterAndTool");
const waitTillHTMLRendered = require("./waitTillHTMLRendered");
const { program } = require('commander');
program
    .name('rup-penyedia')
    .description('Ekstrak nilai RUP Penyedia dari website RUP LKPP.')
    .argument('<url>', 'URL RUP Penyedia')
    .option('-r, --resume', 'Lanjutkan dari proses pembacaan terakhir')
    .option('--show-browser', 'Tampilkan browser pada saat proses pembacaan.')
    .option('-t, --tahun-anggaran <ta>', 'Dapatkan spesifik data pada Tahun Anggaran, ex: -t 2010')
    .option('-m, --max-page <mp>', 'Set maksimal halaman dibaca (default sampai habis), ex: -m: 10')
    .usage("node rup-penyedia.js <url> -r --show-browser")
    .showHelpAfterError()
    .action((url, options) => {
        run(url, options);
    });

async function choseTahunAnggaran(currentPage, tahunAnggaranIni)
{
    try {
        await currentPage.evaluate(tahunAnggaranIni => {
            const links = Array.from(document.querySelectorAll('#bs-example-navbar-collapse-1 > ul.nav.navbar-nav.navbar-right > li.dropdown > ul > li > a'));
            let i = 0;
            for(i = 0; i < links.length; i++) {
                let linkText = links[i].innerText.trim();
                if(linkText == tahunAnggaranIni) {
                    break;
                }
            }
            links[i].click();
        }, tahunAnggaranIni)
        .then(()=>console.log('Memilih tahun anggaran: ' + tahunAnggaranIni));

    } catch (error) {
        console.error('Gagal melakukan load tahun anggaran: ' + tahunAnggaranIni + "\n" + error);
        return false;
    }
    // sekarang kembalikan ke halaman utama dari javascript karena klo pakai goto session ke reset
    // await page.goto(halamanUtama, {waitUntil: ['networkidle2', 'domcontentloaded']}); // render url utama lagi dengan session saat ini 
    await page.waitForTimeout(500); // timeout dulu !
    await page.evaluate(halamanUtama => {
        window.location.assign(halamanUtama);
    }, halamanUtama)
    .then(()=>console.log("Balik ke halaman utama ... "));
    return true;
}

async function run(halamanUtama, options) 
{    
    const showBrowser = options.showBrowser,
        maxPage = options.maxPage ?? -1,
        tahunAnggaran = options.tahunAnggaran ?? false;

    const browser = await puppeteer.launch({
        headless: showBrowser ? false: true, 
        timeout: 10000,
        // userDataDir: './userdata',
        args: [
            '--shm-size=3gb','--no-sandbox', '--disable-setuid-sandbox'
        ]
    });
    const page = await browser.newPage();
    let initGood = true;

    page.on('console', (msg) => console.log('PAGE_LOG:', msg.text()));
    await page.goto(halamanUtama, {waitUntil: ['networkidle2', 'domcontentloaded']});

    if(tahunAnggaran !== false) {
        initGood = await choseTahunAnggaran(page, tahunAnggaran);
        if(!initGood) {
            console.error("Memilih tahun anggaran tapi tahun anggaran gagal dipilih!");
        } 
    }
    
    if(initGood) {

        // first page then ... 
        await waiterAndTool.waitForProcessFinished(page);
        await waiterAndTool.selectItemsCountTo100(page);

        let keepCrawling = true, 
            currentPage = 1,
            delay = 1000,
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
            // get link to opening dialog windows, click to open and read the content
            const links = await page.$$('table#tblLelangLama tbody tr td:nth-child(3) a'),
                linksLength = links.length;
            let isError = false;
            data = []; // init first
            for(linkOffset = 0; linkOffset < linksLength; linkOffset++) {
                // /sirup/home/detailPaketPenyediaPublic2017/31150077
                // we need to get RUP ID
                const href = await page.evaluate(link => link.href, links[linkOffset]);
                const hrefSplit = href.split("/"),
                    idRup = hrefSplit[hrefSplit.length - 1]; 

                await page.evaluate(linkOffset => {
                        const linkToClickSelector = `table#tblLelangLama tbody tr:nth-child(${linkOffset+1}) td:nth-child(3) a:nth-child(1)`;
                        // console.log('Click yo', linkToClickSelector);
                        document.querySelector(linkToClickSelector).click();
                    }, linkOffset)
                    .then(()=>console.log('Data #', linkOffset, ' page ', currentPage, ' load modal of :', href));
                await page.waitForNetworkIdle()
                    .then(() => console.log('Loaded'));
                try {
                    await page.waitForSelector('div#detil > table tbody tr:nth-child(1) td:nth-child(2)'); // wait for the element of RUP ID
                    await page.waitForFunction("document.querySelector('div#detil > table tbody tr:nth-child(1) td:nth-child(2)').innerText == '" + idRup + "'");
                } catch(error) {
                    console.log("Tidak dapat melakukan pengambilan load baru!", error);
                    isError = true;
                    break;
                }
                // await waitTillHTMLRendered.waitTillHTMLRendered(page, { querySelector: "div#myModal" });
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
                            case 'alasan bukan usaha kecil/koperasi': dataInPage['alasan_bukan_usaha_kecil_koperasi'] = row.querySelector('td:nth-child(2)').innerText.trim(); break;
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
                            case 'lokasi pekerjaan':
                                tableDt = Array.from(row.querySelectorAll('td:nth-child(2) table tbody tr'));
                                dataInPage['lokasi'] = tableDt.map(row => {
                                    if(row.querySelector('td:nth-child(2)') == null) {
                                        return false;
                                    }
                                    return [
                                        row.querySelector('td:nth-child(2)').innerText,
                                        row.querySelector('td:nth-child(3)').innerText,
                                        row.querySelector('td:nth-child(4)').innerText,
                                    ].join('>');
                                }).filter(i => i != false).join('|');
                                break;
                            case 'sumber dana':
                                tableDt = Array.from(row.querySelectorAll('td:nth-child(2) table tbody tr'));
                                dataInPage['sumber_dana'] = tableDt.map(row => {
                                    if(row.querySelector('td:nth-child(2)') == null) {
                                        return false;
                                    }
                                    return [
                                        row.querySelector('td:nth-child(2)').innerText,
                                        row.querySelector('td:nth-child(3)').innerText,
                                        row.querySelector('td:nth-child(4)').innerText,
                                        row.querySelector('td:nth-child(5)').innerText,
                                        row.querySelector('td:nth-child(6)').innerText,
                                    ].join('|');
                                }).filter(i => i != false).join(',');
                                break;
                        }
                    });
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
                // tutup modal
                await page.waitForSelector('div#myModal .modal-footer button.btn.btn-rup.btn-redPastel');
                await page.evaluate(() => document.querySelector('div#myModal .modal-footer button.btn.btn-rup.btn-redPastel').click());
                await page.waitForTimeout(350);
                await page.waitForSelector('div#myModal', {
                    visible: false
                });
            }


            // save our data
            const pageStr = ('' + currentPage).padStart(4, '0');
            await fs.writeFile(currentFileName + '-' + pageStr + '.db', JSON.stringify(data));
            if(isError) {
                console.log("FORCE BREAK we got some error!");
                break;
            }
            // next button "Selanjutnya" exist if it doesn't in disabled state!
            const isNextButtonExist = await page.evaluate(() => document.querySelector('li#tblLelangLama_next.disabled') == null);
            if(!isNextButtonExist) {
                keepCrawling = false;
            } else if(maxPage > 0 && currentPage >= maxPage) {
                keepCrawling = false;
            } else {
                currentPage++;
                await page.waitForTimeout(delay);
                await waiterAndTool.clickNextPage(page);
            }
        }

    }
    // await browser.close();
}

program.parse();