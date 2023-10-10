const axios = require('axios');
const { getFinalUrl } = require('./get-final-url');
const { hashFunction } = require('./hash');
const cheerio = require('cheerio');

const throwFormattedError = (errorMessage) => (error) => {
    const formattedError = new Error(`${errorMessage}: ${error.message}`);
    formattedError.stack = error.stack;
    throw formattedError;
}

const handlers = module.exports.handlers = [
    {
        criteria: (resource) => resource.type === 'url' && !resource.meta?.resolved,
        handle: async (resource) => {
            try {

                const {url: finalUrl, headers} = await getFinalUrl(resource.data)
                    .catch(throwFormattedError(`Failed to fetch URL: ${resource.data}`));
    
                // Create and return a new resource
                return {
                    type: 'url',
                    meta: {
                        resolved: true,
                        contentType: headers['content-type'],
                    },
                    data: finalUrl
                };
            } catch (e) {
                if(/404/.test(e.message)) {
                    return [];
                }
            }
        }
    },
    {
        criteria: (resource) => resource.type === 'url' && resource.meta?.resolved && /^text\/html\b/i.test(resource.meta?.contentType),
        handle: async (resource) => {
            const response = await axios.get(resource.data)
                .catch(throwFormattedError(`Failed to fetch URL: ${resource.data}`));

            // Create and return a new resource
            return {
                type: 'html',
                meta: {
                    url: resource.data,
                    status: response.status,
                    contentType: response.headers['content-type'],
                    // ... any other necessary fields
                },
                data: response.data
            };
        }
    },
    {
        criteria: (resource) => resource.type === 'html' && /wikipedia\.org/i.test(resource.meta?.url),
        handle: (resource) => {
            const $ = cheerio.load(resource.data);
            return {
                type: 'json',
                meta: {
                    url: resource.meta.url,
                },
                data: {
                    title: $('title').text().trim(),
                    image: $('meta[property="og:image"]').attr('content'),
                    content: $('#mw-content-text').text().trim().slice(0,100),
                }
            };
        }
    },
    {
        criteria: (resource) => resource.type === 'url' && resource.meta?.resolved && /^image\/(jpeg|png)\b/i.test(resource.meta?.contentType),
        handle: async (resource) => {

            const {data: imageData, headers} = await axios.get(resource.data, {responseType: 'arraybuffer'})
                    .catch(throwFormattedError(`Failed to download image: ${resource.data}`));

            return {
                type: 'image',
                meta: {
                    url: resource.data,
                    contentType: headers['content-type'],
                },
                data: imageData,
            };
        }
    },
    {
        criteria: (resource) => resource.type === 'html',
        handle: async (resource) => {
            const $ = cheerio.load(resource.data);
            const imageUrl = $('meta[property="og:image"]').attr('content');
            if(!imageUrl) return;

            return {
                type: 'url',
                data: imageUrl,
            };
        }
    },
    {
        criteria: (resource) => resource.type === 'html' && /^https:\/\/hawthornetheatre\.com\/events\/$/i.test(resource.meta?.url),
        handle: (resource) => {
            const $ = cheerio.load(resource.data);

            const eventPageUrls = $('a#eventTitle').map((i, el) => $(el).attr('href')).get();

            return eventPageUrls.map((url) => ({
                type: 'url',
                data: url
            }));
        }
    },
    {
        criteria: (resource) => resource.type === 'html' && /^https?:\/\/hawthornetheatre\.com\/event\/([^\/]+)\/([^\/]+)\/([^\/]+)\//i.test(resource.meta?.url),
        handle: (resource) => {
            const $ = cheerio.load(resource.data);
            const tagLine = $('.eventTagLine').text().trim();
            const presentedBy = tagLine.match(/^(?<host>.+)\s+presents:/i)?.groups?.host;
            return {
                type: 'event',
                meta: {
                    url: resource.meta.url,
                },
                data: {
                    title: $('#eventTitle').text().trim(),
                    tagLine: $('.eventTagLine').text().trim(),
                    presentedBy,
                    date: $('.eventStDate').first().text().trim(),
                    time: $('.eventDoorStartDate').first().text().trim(),
                    cost: $('.eventCost').first().text().trim(),
                    imageUrl: $('img.singleEventImage').attr('src'),
                    ticketUrl: $('[id^="ctaspa"] a').attr('href'),
                    isSoldOut: !!$('[id^="ctaspa"] a:icontains("sold out")').length,
                    description: $('.singleEventDescription').first().text().trim(),
                    ageText: $('.eventAgeRestriction').first().text().trim(),
                    venueName: $('.venueLink').first().text().trim(),
                }
            };
        }
    },
    {
        criteria: (resource) => resource.type === 'event' && resource.data?.imageUrl,
        handle: async (resource) => {
            return {
                type: 'url',
                data: resource.data?.imageUrl,
            };
        }
    }
].map((handler) => ({
    ...handler,
    hash: hashFunction(handler.handle)
}));

module.exports.getMatchingHandlers = (resource) => {
    return handlers.filter(({criteria}) => criteria(resource));
};