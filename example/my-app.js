const fs = require('fs');
const { resourceHandlerOperator } = require ('../libs/resource-handler-operator');
const { mergeMap, of } = require('rxjs');
const myHandlers = require('./my-handlers');
const db = require('../libs/db-mongo');
const { toResUrl } = require('../libs/web/resource-types');

// This app crawls random wikipedia page and downloads images to /exports

(async () => {

    await db.setup({mongoUrl: 'mongodb://localhost:27017/dance-pdx'});
    const scopeOperator = resourceHandlerOperator(db.handleResource);
    
    const mainOperator = scopeOperator(myHandlers);
    // We can do subset of operators too: scopeOperator(otherSubsetHandlers)
    
    // Seeder. TODO - upsert instead of create
    const initialResource = await db.createResource(toResUrl('https://hawthornetheatre.com/events/')).save();
    const crawler = of(initialResource).pipe(mainOperator);

    console.log("INITIAL:", (await db.countResources({})));
    
    await crawler.theMainCrawler$.pipe(mergeMap(async (res) => {
        // Custom exporting of data
        if(res.type === 'image') {
            const {fPart = 'untitled', ext = ''} = res.meta.url.match(/\/(?<fPart>[^/]+)\.(?<ext>[a-z]+)$/i)?.groups || {};
            const fnName = `${fPart}_${res.hash.slice(0,5)}.${ext}`;
            const fPath = `${__dirname}/exports/${fnName}`;
            if(!res.isFromCache() || !fs.existsSync(fPath)) {
                if(res.data instanceof Uint8Array) {
                    fs.writeFileSync(fPath, Buffer.from(res.data));
                } else if(res.data?.buffer) {
                    fs.writeFileSync(fPath, res.data.buffer);
                }
            }
        }
        if(res.type === 'event') {
            // console.log(res.id.toString());
        }
        if(res.type === 'url' && res.meta?.resolved) {
            // console.log(res.data, res.meta?.contentType);
        }
        if(res.type === 'error') {
            console.error(res);
        }
    })).toPromise();
    
    console.log("COMPLETE DONE");

})().then(process.exit);