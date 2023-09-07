const axios = require('axios');
const { getFinalUrl } = require('./get-final-url');

module.exports.getMatchingHandlers = (resource) => {
    
    if(resource.type === 'url' && !resource.meta?.resolved) {
        // URL resolver
        // TODO - maybe don't inc depth?
        return [
            {
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
            }
        ]
    }

    if(resource.type === 'url' && resource.meta?.resolved) {
        // URL getter for resolved urls
        return [
            {
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
        ]
    }

    // if(resource.type === 'html' && /wikipedia/i.test(resource.meta?.url)) {
    //     return [
    //         {
    //             handle: async (resource) => {
    //                 // Get a href links in resource.data
    //             }
    //         }
    //     ]
    // }
    return [];
};