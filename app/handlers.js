const axios = require('axios');
const { getFinalUrl } = require('./get-final-url');
const { hashString } = require('./hash');

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
    }
].map((handler) => ({
    ...handler,
    hash: hashString('sha256', handler.handle.toString())
}));

module.exports.getMatchingHandlers = (resource) => {
    return handlers.filter(({criteria}) => criteria(resource));
};