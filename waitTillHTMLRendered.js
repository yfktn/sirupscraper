/**
 * Sometimes we don't know when part of the HTML is still changing after javascript has processed 
 * it, so let's write a wait function for it. This will run until the part doesn't change anymore.
 * The source: https://stackoverflow.com/a/61304202
 * @param {*} page 
 * @param {*} options 
 */
async function waitTillHTMLRendered(page, options = {}) {
    const paramsDefault = {querySelector: '', verbose: false, timeout : 30000},
      optionsUsed = { ...paramsDefault, ...options }; // merge the object
    const checkDurationMsecs = 1000;
    const maxChecks = optionsUsed.timeout / checkDurationMsecs;
    const querySelectorLength = optionsUsed.querySelector.length;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;
    let currentHTMLSize = 0;
    try {
      // first time?
      currentHTMLSize = querySelectorLength <= 0? 
        await page.content().length: 
        await page.evaluate((querySelector) => document.querySelector(querySelector).innerHTML.length, optionsUsed.querySelector);
    } catch(error) {
      console.error('waitTillHTMLRendered Failed!');
      throw error;
    }

    while(checkCounts++ <= maxChecks){
      // let currentHTMLSize = html.length; 
  
      let bodyHTMLSize = querySelectorLength <= 0?
        await page.evaluate(() => document.body.innerHTML.length):
        await page.evaluate((querySelector) => document.querySelector(querySelector).innerHTML.length, optionsUsed.querySelector);
  
      if(optionsUsed.verbose) {
        console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);
      }
  
      if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) 
        countStableSizeIterations++;
      else 
        countStableSizeIterations = 0; //reset the counter
  
      if(countStableSizeIterations >= minStableSizeIterations) {
        if(optionsUsed.verbose) console.log("Page rendered fully..");
        break;
      }
  
      lastHTMLSize = currentHTMLSize;
      await page.waitForTimeout(checkDurationMsecs);
      
      currentHTMLSize = querySelectorLength <= 0? 
        await page.content().length: 
        await page.evaluate((querySelector) => document.querySelector(querySelector).innerHTML.length, optionsUsed.querySelector);
    }
  }

module.exports = {
  waitTillHTMLRendered
};