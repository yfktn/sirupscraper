/**
 * Process of progress bar 
 * @param {pappeteer.Page} page 
 * @returns 
 */
async function waitForProcessFinished(page) {
    return page.waitForSelector('div#tblLelangLama_processing', {
        visible: false,
    });
}

/**
 * We are need to wait for pagination loaded first.
 * @param {pappeteer.Page} page 
 * @returns 
 */
async function waitForPagination(page) {
    return page.waitForSelector('ul.pagination li.paginate_button a', {
        visible: true,
    });
}

/**
 * Make sure the selected page in the pagination controls equals the value of pageToCheck!
 * @param {puppeteer.Page} page 
 * @param {int} pageToCheck the page to check
 * @returns 
 */
async function waitForPaginationOke(page, pageToCheck) {
    return page.waitForFunction("document.querySelector('li.paginate_button.active a').innerText == '" + pageToCheck + "'");
}

/**
 * Click the next page button!
 * @param {pappeteer.Page} page 
 * @returns 
 */
async function clickNextPage(page) {
    return page.click('li#tblLelangLama_next a');
}

/**
 * Choose how many RUP items display on each page.
 * @param {pappeteer.Page} page 
 * @returns 
 */
async function selectItemsCountTo100(page) {
    return page.select('select.form-control.input-sm', '100')
}

module.exports = { 
    waitForProcessFinished, 
    waitForPagination,
    waitForPaginationOke,
    clickNextPage,
    selectItemsCountTo100 
};