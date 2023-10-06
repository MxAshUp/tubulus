const fs = require('fs');
const { resourceCrawler } = require('./resource-crawler');

// This app crawls random wikipedia page and downloads images to /exports

(async () => {
    const {
        theMainCrawler$,
        topResources$,
        unhandledResources$,
        unhandledTopLevelResources$,
        orphanedResources$,
        Resource,
    } = await resourceCrawler();

    // Seeder
    // console.log("INITIAL:", (await Resource.find({})));
    // await Resource.deleteMany({});
    console.log("INITIAL:", (await Resource.find({})).length);
    // setInterval(async () => {
    //     console.log("INSERT YO>....");
    //     new Resource({
    //         type: 'url',
    //         data: 'https://en.wikipedia.org/wiki/Special:Random',
    //     }).save();
    // }, 3000);

    theMainCrawler$.subscribe((res) => {
        if(res.type === 'image') {
            const fnName = res.meta.url.match(/\/([^\/]+\.[a-z]+)$/i)?.[1];
            const fPath = `${__dirname}/exports/${fnName}`;
            if(!res.isFromCache() || !fs.existsSync(fPath)) {
                if(res.data instanceof Uint8Array) {
                    fs.writeFileSync(fPath, Buffer.from(res.data));
                } else if(res.data?.buffer) {
                    fs.writeFileSync(fPath, res.data.buffer);
                }
            }
        }
    }, console.log, console.log.bind(null, "DONE DONE"));

})();