const axios = require('axios');
const { getFinalUrl } = require('./get-final-url');
const { hashFunction } = require('./hash');
const cheerio = require('cheerio');

const handlers = module.exports.handlers = [
    {
        criteria: (resource) => resource.type === 'url' && !resource.meta?.resolved,
        handle: async (resource) => {
            try {
                const finalUrl = await getFinalUrl(resource.data);

                // Create and return a new resource
                return [{
                    type: 'url',
                    meta: {
                        resolved: true,
                    },
                    data: finalUrl
                }];
            } catch (error) {
                // Handle the error, maybe log it or return an error resource
                error.message = "Failed to fetch URL:" + resource.meta.url;
                throw error;
            }
        }
    },
    {
        criteria: (resource) => resource.type === 'url' && resource.meta?.resolved,
        handle: async (resource) => {
            try {
                const response = await axios.get(resource.data);

                // Create and return a new resource
                return [{
                    type: 'html',
                    meta: {
                        url: resource.data,
                        status: response.status,
                        contentType: response.headers['content-type'],
                        // ... any other necessary fields
                    },
                    data: response.data
                }];
            } catch (error) {
                // Handle the error, maybe log it or return an error resource
                error.message = "Failed to fetch URL:" + resource.meta.url;
                throw error;
            }
        }
    },
    {
        criteria: (resource) => resource.type === 'html' && /wikipedia\.org/i.test(resource.meta?.url),
        handle: (resource) => {
            const $ = cheerio.load(resource.data);
            return [
                {
                    type: 'json',
                    meta: {
                        url: resource.meta.url,
                    },
                    data: {
                        title: $('title').text().trim(),
                        image: $('meta[property="og:image"]').attr('content'),
                        content: $('#mw-content-text').text().trim().slice(0,100),
                    }
                }
            ]
        }
    },
    {
        criteria: (resource) => resource.type === 'html',
        handle: async (resource) => {
            const $ = cheerio.load(resource.data);
            const imageUrl = $('meta[property="og:image"]').attr('content');
            if(!imageUrl) return;
            const {data: imageData} = await axios.get(imageUrl, {responseType: 'arraybuffer'});
            return [
                {
                    type: 'image',
                    meta: {
                        url: imageUrl,
                    },
                    data: imageData,
                }
            ]
        }
    }
].map((handler) => ({
    ...handler,
    hash: hashFunction(handler.handle)
}));

module.exports.getMatchingHandlers = (resource) => {
    return handlers.filter(({criteria}) => criteria(resource));
};