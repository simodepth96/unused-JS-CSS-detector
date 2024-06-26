const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// list of URLs to process
const urls = [
'https://www.viviennewestwood.com/',
'https://www.viviennewestwood.com/en-gb/women/jewellery/necklaces/',
'https://www.viviennewestwood.com/en-us/women/jewellery/necklaces/mini-bas-relief-choker-platinum-crystal-pearl/63030006-02P131-CN-platinum-crystal-pearl.html',
'https://www.viviennewestwood.com/collections/',
'https://www.viviennewestwood.com/westwood-world/the-story-so-far/',
'https://www.viviennewestwood.com/customer-service/shipping-information/',
'https://www.viviennewestwood.com/stores/',
];

//
// WARNING - DO NOT EDIT BELOW
//

const csvWriter = createCsvWriter({
  path: 'output.csv',
  header: [
    {id: 'url', title: 'URL'},
    {id: 'resource', title: 'Resource'},
    {id: 'resourceFile', title: 'Resource File Type'},
    {id: 'resourceType', title: 'Resource Type'},
    {id: 'totalBytes', title: 'Total Bytes'},
    {id: 'unusedBytes', title: 'Unused Bytes'},
    {id: 'percentUnused', title: 'Percent Unused'}
  ]
});

function getResourceType(url, resourceUrl) {
  if (url === resourceUrl) {
    return 'Inline';
  }
  let urlDomain = new URL(url).hostname;
  let resourceDomain = new URL(resourceUrl).hostname;
  
  if (urlDomain === resourceDomain) {
    return 'Local';
  }
  
  return '3rd Party';
}

async function getUnusedJSAndCSS(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.coverage.startJSCoverage();
  await page.coverage.startCSSCoverage();
  
  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 0
  });
  
  const jsCoverage = await page.coverage.stopJSCoverage();
  const cssCoverage = await page.coverage.stopCSSCoverage();
  
  for (const js of jsCoverage) {
    let totalBytes = js.text.length;
    let usedBytes = 0;

    for (const range of js.ranges) {
      usedBytes += range.end - range.start;
    }

    let unusedBytes = totalBytes - usedBytes;
    let percentUnused = (unusedBytes / totalBytes * 100).toFixed(2);
    let resourceType = getResourceType(url, js.url);

    await csvWriter.writeRecords([{
      url: url, 
      resource: js.url, 
      resourceFile: 'JavaScript',
      resourceType: resourceType, 
      totalBytes: totalBytes, 
      unusedBytes: unusedBytes, 
      percentUnused: percentUnused 
    }]);
  }

  for (const css of cssCoverage) {
    let totalBytes = css.text.length;
    let usedBytes = 0;

    for (const range of css.ranges) {
      usedBytes += range.end - range.start;
    }

    let unusedBytes = totalBytes - usedBytes;
    let percentUnused = (unusedBytes / totalBytes * 100).toFixed(2);
    let resourceType = getResourceType(url, css.url);

    await csvWriter.writeRecords([{
      url: url, 
      resource: css.url, 
      resourceFile: 'CSS',
      resourceType: resourceType, 
      totalBytes: totalBytes, 
      unusedBytes: unusedBytes, 
      percentUnused: percentUnused 
    }]);
  }
  
  console.log(`Processed URL: ${url}`);
  await browser.close();
}


(async function() {
  for (const url of urls) {
    await getUnusedJSAndCSS(url);
  }
})();
