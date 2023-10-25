const cheerio = require('cheerio');

const { every, typeEquals, bindScope } = require('./libs/scope-utilities');
const { isHtml, hostEquals, hostMatches, urlOfPageMatches, pathMatches } = require('./libs/web/scopes');

const { urlResolveHandler, url2HtmlHandler, url2ImageHandler } = require('./libs/web/handlers');
const { html2Value, html2Object } = require('./libs/web/transformers');

const scopeWikipedia = bindScope(isHtml, hostMatches(/\bwikipedia.org$/));
const scopeHawthornePages = bindScope(isHtml, hostEquals('hawthornetheatre.com'));

module.exports = [

    urlResolveHandler,
    url2HtmlHandler,
    url2ImageHandler,

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

    // Event parser, ticket url getter
    {
        scope: every(typeEquals('event'), (resource) => resource.data?.ticketUrl),
        transform: (resource) => {
            return {
                type: 'url',
                meta: {
                    canonicalUrl: resource.meta.url,
                },
                data: resource.data?.ticketUrl,
            };
        }
    }
];