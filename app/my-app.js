const fs = require('fs');
const { resourceCrawler } = require ('./libs/resource-crawler');
const { mergeMap } = require('rxjs');
const { getMatchingHandlers } = require('./libs/handlers');

// This app crawls random wikipedia page and downloads images to /exports

(async () => {
    const {
        theMainCrawler$,
        Resource,
    } = await resourceCrawler({
        getMatchingHandlers,
    });

    // Seeder
    console.log("INITIAL:", (await Resource.count({})));
    
    new Resource({
        type: 'url',
        data: 'https://hawthornetheatre.com/events/',
    }).save();


    await theMainCrawler$.pipe(mergeMap(async (res) => {
        // Custom exporting of data
        if(res.type === 'image') {
            const {fPart = 'untitled', ext = ''} = res.meta.url.match(/\/(?<fPart>[^\/]+)\.(?<ext>[a-z]+)$/i)?.groups || {};
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
            console.log(res);
        }
        if(res.type === 'url' && res.meta?.resolved) {
            // console.log(res.data, res.meta?.contentType);
        }
    })).toPromise();
    
    console.log("COMPLETE DONE");

})().then(process.exit);