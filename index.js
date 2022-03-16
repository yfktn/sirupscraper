const puppeteer = require('puppeteer');

const url = process.argv[2];
if(!url) {
    throw "URL untuk mendapatkan halaman awal SiRUP dari inaproc.id belum ditentukan!";
}

async function run(halamanUtama) {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto(halamanUtama);
    data = await page.evaluate(() => {
        // dapatkan baris array untuk table nya
        const rows = Array.from(document.querySelectorAll(".section-rup tbody tr"));
        //kemudian 
        return rows.map((row) => {
            // di sini query lagi untuk td nya
            const columns = Array.from(row.getElementsByTagName('td'));
            // baru untuk masing-masing dt
            return {
                idrup: columns[0].querySelector("a.btn-detail").getAttribute('data-id'),
                paket: columns[0].querySelector("a.btn-detail").textContent,
                jenis: columns[0].getElementsByTagName("div")[1].textContent,
                metode: columns[0].getElementsByTagName("div")[2].textContent,
            };
        })

    });
    console.log(data);
    browser.close();
}

run(url);