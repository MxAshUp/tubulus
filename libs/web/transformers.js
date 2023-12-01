const cheerio = require('cheerio');
const { toResOfType } = require('../resource-utilities');

module.exports = {
    html2Object: (type, selectors) => (resource) => {
        const $ = cheerio.load(resource.data);
        const jsonData = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, selector($)]));
        return toResOfType(type)(jsonData, {
            url: resource.meta.url,
        });
    },
    
    html2Value: (type, selector) => (resource) => {
        const $ = cheerio.load(resource.data);
        const data = selector($);
        return toResOfType(type)(data, {
            url: resource.meta.url,
        });
    }    
}