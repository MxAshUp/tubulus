const axios = require('axios');
const { getFinalUrl } = require('./get-final-url');
const cheerio = require('cheerio');
const { throwFormattedError, hashFunction } = require('./utilities');
const {
    every,
    typeEquals,
} = require('./criteria');
const {
    isHtml,
    hostEquals,
    urlOfPageMatches,
    isUnresolvedUrl,
    contentTypeOfUrlMatches,
    pathMatches,
} = require('./criteria-web');

const urlResolver = {
    criteria: isUnresolvedUrl,
    handle: async (resource) => {
        try {

            const {url: finalUrl, headers} = await getFinalUrl(resource.data)
                .catch(throwFormattedError(`Failed to fetch URL: ${resource.data}`));

            // Create and return a new resource
            return {
                type: 'url',
                meta: {
                    ...(resource.meta ? resource.meta : {}),
                    resolved: true,
                    contentType: headers['content-type'],
                },
                data: finalUrl
            };
        } catch (e) {
            // TODO - improve error handling
            if(/404/.test(e.message)) {
                return;
            }
        }
    }
};

const url2Html = {
    criteria: contentTypeOfUrlMatches(/^text\/html\b/i),
    handle: async (resource) => {
        const response = await axios.get(resource.data)
            .catch(throwFormattedError(`Failed to fetch URL: ${resource.data}`));

        // Create and return a new resource
        return {
            type: 'html',
            meta: {
                ...(resource.meta ? resource.meta : {}),
                url: resource.data,
                status: response.status,
                contentType: response.headers['content-type'],
            },
            data: response.data
        };
    }
};

// Restricts the conditions of an array of handlers to a specific URL domain 
const scopeHandlers = (...predicate) => (handlers) => handlers.map(({criteria, ...handlerArgs}) => ({
    criteria: every(...predicate, criteria),
    ...handlerArgs,
}));

const scopeWikipedia = scopeHandlers(hostEquals('wikipedia.org'));

const scopeHawthornePages = scopeHandlers(isHtml, hostEquals('hawthornetheatre.com'));

const html2Object = (type, selectors) => (resource) => {
    const $ = cheerio.load(resource.data);
    const jsonData = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, selector($)]));
    return {
        type,
        meta: {
            url: resource.meta.url,
        },
        data: jsonData,
    };
};

const html2Value = (type, selector) => (resource) => {
    const $ = cheerio.load(resource.data);
    const data = selector($);
    return {
        type,
        meta: {
            url: resource.meta.url,
        },
        data,
    };
};

const handlers = module.exports.handlers = [

    // Generic url and content-type resolver
    urlResolver,

    // Generic HTML getter
    url2Html,

    ...scopeWikipedia([
        {
            criteria: isHtml,
            handle: html2Object('json', {
                title: ($) =>   $('title').text().trim(),
                image: ($) =>   $('meta[property="og:image"]').attr('content'),
                content: ($) => $('#mw-content-text').text().trim().slice(0,100),
            })
        },
        {
            criteria: isHtml,
            handle: html2Value('url', $ => $('meta[property="og:image"]').attr('content')),
        },
    ]),

    ...scopeHawthornePages([
        {
            // Events page
            criteria: pathMatches(/^\/events\/$/i),
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
            // Hawthorn events: event parser
            criteria: pathMatches(/^\/event\/([^\/]+)\/([^\/]+)\/([^\/]+)\//i),
            handle: html2Object('event', {
                title: $ =>       $('#eventTitle').text().trim(),
                tagLine: $ =>     $('.eventTagLine').text().trim(),
                presentedBy: $ => $('.eventTagLine').text().trim().match(/^(?<host>.+)\s+presents:/i)?.groups?.host,
                date: $ =>        $('.eventStDate').first().text().trim(),
                time: $ =>        $('.eventDoorStartDate').first().text().trim(),
                cost: $ =>        $('.eventCost').first().text().trim(),
                imageUrl: $ =>    $('img.singleEventImage').attr('src'),    
                ticketUrl: $ =>   $('[id^="ctaspa"] a').attr('href'),
                isSoldOut: $ =>   !!$('[id^="ctaspa"] a:icontains("sold out")').length,
                description: $ => $('.singleEventDescription').first().text().trim(),
                ageText: $ =>     $('.eventAgeRestriction').first().text().trim(),
                venueName: $ =>   $('.venueLink').first().text().trim(),
            })
        },
    ]),

    // Etix: Event Parser
    {
        criteria: urlOfPageMatches(/^https:\/\/event\.etix\.com\/ticket\/online\//i),
        handle: (resource) => {
            const $ = cheerio.load(resource.data);
            return {
                type: 'event',
                meta: {
                    url: resource.meta.url,
                    canonicalUrl: resource.meta.canonicalUrl,
                },
                data: {
                    description: $('.description[itemprop="description"]').text().trim()
                }
            }
        }
    },

    // Event parser, image getter
    {
        criteria: every(typeEquals('event'), (resource) => resource.data?.imageUrl),
        handle: (resource) => ({
            type: 'url',
            data: resource.data?.imageUrl,
        })
    },

    // Generic image downloader
    {
        criteria: contentTypeOfUrlMatches(/^image\/(jpeg|png)\b/i),
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

    // Event parser, ticket url getter
    {
        criteria: every(typeEquals('event'), (resource) => resource.data?.ticketUrl),
        handle: async (resource) => {
            return {
                type: 'url',
                meta: {
                    canonicalUrl: resource.meta.url,
                },
                data: resource.data?.ticketUrl,
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