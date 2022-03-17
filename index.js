const puppeteer = require('puppeteer');
const fs = require("fs/promises");

const url = process.argv[2];
if(!url) {
    throw "URL untuk mendapatkan halaman awal SiRUP dari inaproc.id belum ditentukan!";
}

async function run(halamanUtama) {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();

    await page.goto(halamanUtama, {waitUntil: 'networkidle2'});

    page.on('console', (msg) => console.log('PAGE_LOG:', msg.text()));

    let keepCrawling = true, 
        maxPage = 200, 
        currentPage = 1, 
        delay = 1500;
    let allData = [];

    while( keepCrawling && currentPage <= maxPage ) {
        try {
            // tunggu sampai kelihatan tombol untuk nextnya!
            await page.waitForSelector(".section-rup div.ui.menu.two.item a")
                .then(() => console.log(currentPage)); // supaya ada progress berikan pesan!
        } catch (error) {
            keepCrawling = false;
        }
        // baru lakukan evaluate di bawah ini!
        const data = await page.evaluate(() => {
            // dapatkan baris array untuk table nya
            const rows = Array.from(document.querySelectorAll(".section-rup tbody tr"));

            //kemudian 
            return rows.map((row) => {
                // di sini query lagi untuk td nya
                const columns = Array.from(row.getElementsByTagName('td'));
                // ambil modal idnya dulu untuk detail
                const idrup = columns[0].querySelector("a.btn-detail").getAttribute('data-id'),
                    modalid = 'modal-' + idrup,
                    modalDataDetail = document.getElementById(modalid), // ambil data dari modal yang menjadi detailnya
                    tableData = modalDataDetail.getElementsByTagName('table'); // ini adalah table nya yang menjadi tempat tampil

                // baru untuk masing-masing dt
                return {
                    idrup: idrup,
                    paket: columns[0].querySelector("a.btn-detail").textContent,
                    jenis: columns[0].getElementsByTagName("div")[1].textContent,
                    metode: columns[0].getElementsByTagName("div")[2].textContent,
                    klpd: columns[1].querySelector("div.ui.list.hidden-md-down > div:nth-child(1)").innerText.trim(),
                    satker: columns[1].querySelector("div.ui.list.hidden-md-down > div:nth-child(2)").innerText.trim(),
                    lokasi: columns[1].querySelector("div.ui.list.hidden-md-down > div:nth-child(3)").innerText.trim(),
                    pagu: columns[2].querySelector("div.ui.label").innerText.trim(),
                    // tahun_anggaran: columns[2].querySelector("div:nth-child(1)").innerText.trim(),
                    // detail harus mengambil dari isi dialog
                    kegiatan: tableData[0].querySelector('tbody > tr:nth-child(2) > td:nth-child(2)').innerText.trim(),
                    tahun_anggaran: tableData[0].querySelector('tbody > tr:nth-child(3) > td:nth-child(2)').innerText.trim(),
                    volume: tableData[0].querySelector('tbody > tr:nth-child(4) > td:nth-child(2)').innerText.trim(),
                    sumber_dana: tableData[1].querySelector('tbody > tr:nth-child(2) > td:nth-child(2)').innerText.trim(),
                    periode_pemilihan: tableData[2].querySelector('tbody > tr:nth-child(2) > td:nth-child(2)').innerText.trim(),
                    periode_pekerjaan: tableData[2].querySelector('tbody > tr:nth-child(3) > td:nth-child(2)').innerText.trim(),
                };
            })
        });
        // tambahkan ke sini!
        allData = allData.concat(data);
        currentPage++;
        if( keepCrawling ) {
            page.waitForTimeout(delay);
            
            // ambil semua link pengaturan halamannya
            const nextPrevButtonsLength = await page.$$eval('.section-rup div.ui.menu.two.item a', (links) => links.length);
            if(nextPrevButtonsLength == 1) {
                // apakah aktif untuk berikutnya?
                const nextPrevButton = await page.$eval('.section-rup div.ui.menu.two.item a', (link) => link.innerText);
                if(nextPrevButton.toLowerCase().search("berikutnya") > -1) {
                    await page.click('.section-rup div.ui.menu.two.item a');
                } else {
                    keepCrawling = false; // tidak ada tombol berikutnya
                }
            } else if(nextPrevButtonsLength == 2) { // prev and next exist!
                await page.click('.section-rup div.ui.menu.two.item a:nth-child(2)');
            } else {
                console.log("Sudah tidak menemukan tombol berikutnya!");
                keepCrawling = false;
            }
        //    await page.click("#rup > div.pusher > div > section > div.ui.container > div > a");
        }
    }
    // console.log(data);
    await fs.writeFile('hasilBaca.db', JSON.stringify(allData));
    browser.close();
}

run(url);