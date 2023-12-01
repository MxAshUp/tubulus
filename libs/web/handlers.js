const axios = require('axios');
const { getFinalUrl } = require('./get-final-url');
const { throwFormattedError } = require('../utilities');
const { isUnresolvedUrl, contentTypeOfUrlMatches } = require('./scopes');
const { toResUrl, toResHtml, toResImage } = require('./resource-types');

module.exports = {
    urlResolveHandler: {
        scope: isUnresolvedUrl,
        transform: async (resource) => {
            try {
    
                const {url: finalUrl, headers} = await getFinalUrl(resource.data)
                    .catch(throwFormattedError(`Failed to fetch URL: ${resource.data}`));
    
                // Create and return a new resource
                return toResUrl(finalUrl, {
                    ...(resource.meta ? resource.meta : {}),
                    resolved: true,
                    contentType: headers['content-type'],
                });
            } catch (e) {
                // TODO - improve error handling
                if(/404/.test(e.message)) {
                    return;
                }
            }
        }
    },
    
    url2HtmlHandler: {
        scope: contentTypeOfUrlMatches(/^text\/html\b/i),
        transform: async (resource) => {
            const response = await axios.get(resource.data)
                .catch(throwFormattedError(`Failed to fetch URL: ${resource.data}`));
    
            // Create and return a new resource
            return toResHtml(response.data, {
                ...(resource.meta ? resource.meta : {}),
                url: resource.data,
                status: response.status,
                contentType: response.headers['content-type'],
            });
        }
    },

    url2ImageHandler: {
        scope: contentTypeOfUrlMatches(/^image\/(jpeg|png)\b/i),
        transform: async (resource) => {
    
            const {data: imageData, headers} = await axios.get(resource.data, {responseType: 'arraybuffer'})
                    .catch(throwFormattedError(`Failed to download image: ${resource.data}`));
    
            return toResImage(imageData, {
                url: resource.data,
                contentType: headers['content-type'],
            });
        }
    },
}