const Apify = require('apify');
const { Parser } = require('json2csv');
var fs = require('fs');

async function evaluate(page,element){
    try {
        const elemText = await page.$eval(element, elem => elem.innerText)
        return elemText
      } 
      catch(err){

        if (element==".product-shop [id^='product-price-'].price"){
            element=".product-shop .price"
            const elemText = await evaluate(page,element)
            return elemText
        }
        else{
            const elemText="NA";
            return elemText
        }
        
      }
    
}


Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({ url: 'https://www.makaan.com/listings?propertyType=apartment&listingType=buy&pageType=CITY_URLS&cityName=Varanasi&cityId=60&templateId=MAKAAN_CITY_LISTING_BUY' });
    const pseudoUrls = [new Apify.PseudoUrl('https://www.makaan.com/varanasi/[.*]'),new Apify.PseudoUrl('https://www.makaan.com/listings?propertyType=apartment&listingType=buy&pageType=CITY_URLS&cityName=Varanasi&cityId=60&templateId=MAKAAN_CITY_LISTING_BUY&page=[.*]')];
    const dataset = await Apify.openDataset('makaan');
    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        handlePageFunction: async ({ request, page }) => {
            const title = await page.title();
            console.log(`Title of ${request.url}`);
            //const pname =await evaluate(page,"document.title")
            const price =await evaluate(page,".price-wrap")
            const date =await evaluate(page,".verification-date")
            var obj = Object.assign({ Url: request.url, Name: title,price :price,posteddate:date});
            await dataset.pushData(obj);
            await page.waitFor(500) 
            await Apify.utils.enqueueLinks({
                page,
                selector: "a.typelink,[aria-label^='previous page']",
                pseudoUrls,
                requestQueue,
            });
        },
        maxRequestsPerCrawl: 500,
        maxConcurrency: 10,
        launchPuppeteerOptions: {
            headless: false,
        },
    });

    await crawler.run();
    data= await dataset.getData({format: "json"});
    
    const fields = ['Url', 'Name', 'price','posteddate'];
    const json2csvParser = new Parser({ fields });
    const csv = await json2csvParser.parse(data['items']);
    //console.log(csv);
    //var csv = json2csv({ data: data, fields: fields });
    /*fs.writeFile('file.csv', csv,'utf8', function(err) {
        if (err) throw err;
        console.log('file saved');
    });
    */
   fs.writeFileSync('makaan.csv', csv);


});