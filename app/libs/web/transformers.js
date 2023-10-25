const cheerio = require('cheerio');

module.exports = {
    html2Object: (type, selectors) => (resource) => {
        const $ = cheerio.load(resource.data);
        const jsonData = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, selector($)]));
        return {
            type,
            meta: {
                url: resource.meta.url,
            },
            data: jsonData,
        };
    },
    
    html2Value: (type, selector) => (resource) => {
        const $ = cheerio.load(resource.data);
        const data = selector($);
        return {
            type,
            meta: {
                url: resource.meta.url,
            },
            data,
        };
    }    
}