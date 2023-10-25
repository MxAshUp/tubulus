const axios = require('axios');
const { getFinalUrl } = require('./get-final-url');
const cheerio = require('cheerio');
const { throwFormattedError, hashFunction } = require('./utilities');
const {
    every,
    typeEquals,
    bindScope,
    some,
} = require('./scope-utilities');
const {
    isHtml,
    hostEquals,
    urlOfPageMatches,
    isUnresolvedUrl,
    contentTypeOfUrlMatches,
    pathMatches,
} = require('./scope-web');

const urlResolveHandler = {
    scope: isUnresolvedUrl,
    transform: async (resource) => {
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

const url2HtmlHandler = {
    scope: contentTypeOfUrlMatches(/^text\/html\b/i),
    transform: async (resource) => {
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

const scopeWikipedia = bindScope(isHtml, some(hostEquals('wikipedia.org'), hostEquals('en.wikipedia.org')));

const scopeHawthornePages = bindScope(isHtml, hostEquals('hawthornetheatre.com'));

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
    urlResolveHandler,

    // Generic HTML getter
    url2HtmlHandler,

    ...scopeWikipedia([
        {
            transform: html2Object('json', {
                title: ($) =>   $('title').text().trim(),
                image: ($) =>   $('meta[property="og:image"]').attr('content'),
                content: ($) => $('#mw-content-text').text().trim().slice(0,100),
            })
        },
        {
            transform: html2Value('url', $ => $('meta[property="og:image"]').attr('content')),
        },
    ]),

    ...scopeHawthornePages([
        {
            // Events page
            scope: pathMatches(/^\/events\/$/i),
            transform: (resource) => {
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
            scope: pathMatches(/^\/event\/([^\/]+)\/([^\/]+)\/([^\/]+)\//i),
            transform: html2Object('event', {
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
        scope: urlOfPageMatches(/^https:\/\/event\.etix\.com\/ticket\/online\//i),
        transform: (resource) => {
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
        scope: every(typeEquals('event'), (resource) => resource.data?.imageUrl),
        transform: (resource) => ({
            type: 'url',
            data: resource.data?.imageUrl,
        })
    },

    // Generic image downloader
    {
        scope: contentTypeOfUrlMatches(/^image\/(jpeg|png)\b/i),
        transform: async (resource) => {

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
        scope: every(typeEquals('event'), (resource) => resource.data?.ticketUrl),
        transform: async (resource) => {
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
    hash: hashFunction(handler.transform)
}));

module.exports.getMatchingHandlers = (resource) => {
    return handlers.filter(({scope}) => scope(resource));
};