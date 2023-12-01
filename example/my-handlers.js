/* es-lint ignore: unused-var */

const cheerio = require('cheerio');

const { every, typeEquals, bindScope, sequence } = require('../libs/scope-utilities');
const { isHtml, hostEquals, hostMatches, urlOfPageMatches, pathMatches } = require('../libs/web/scopes');

const { urlResolveHandler, url2HtmlHandler, url2ImageHandler } = require('../libs/web/handlers');
const { html2Value, html2Object } = require('../libs/web/transformers');
const { toResUrl } = require('../libs/web/resource-types');
const { toResOfType } = require('../libs/resource-utilities');

const scopeWikipedia = bindScope(hostMatches(/\bwikipedia.org$/));
const scopeHawthornePages = bindScope(isHtml, hostEquals('hawthornetheatre.com'));

const toResEvent = toResOfType('event');

module.exports = [

    // ...sequence([
    //     ...scopeWikipedia([
    //         urlResolveHandler,
    //     ]),
    //     url2HtmlHandler,
    //     {
    //         scope: every(isHtml, hostMatches(/\bwikipedia.org$/)),
    //         transform: html2Object('json', {
    //             title: ($) =>   $('title').text().trim(),
    //             image: ($) =>   $('meta[property="og:image"]').attr('content'),
    //             content: ($) => $('#mw-content-text').text().trim().slice(0,100),
    //         }),
    //     },
    //     {
    //         scope: ({data}) => data?.image,
    //         transform: (resource) => toResUrl(resource.data.image)
    //     },
    //     urlResolveHandler,
    //     url2ImageHandler,
    //     {
    //         scope: typeEquals('image'),
    //         transform: () => {
    //             // nothing
    //         }
    //     }
    // ]),

    ...bindScope(hostEquals('hawthornetheatre.com'))([
        url2HtmlHandler,
        urlResolveHandler,
    ]),

    ...scopeHawthornePages([
        {
            // Events page
            scope: pathMatches(/^\/events\/$/i),
            transform: (resource) => {
                const $ = cheerio.load(resource.data);
    
                const eventPageUrls = $('a#eventTitle').map((i, el) => $(el).attr('href')).get();
    
                return eventPageUrls.map((url) => toResUrl(url));
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
            const eventPartial = {
                description: $('.description[itemprop="description"]').text().trim()
            };
            return toResEvent(eventPartial, {
                url: resource.meta.url,
                canonicalUrl: resource.meta.canonicalUrl,
            });
        }
    },

    // Event parser, image getter
    {
        scope: every(typeEquals('event'), (resource) => resource.data?.imageUrl),
        transform: (resource) => toResUrl(resource.data.imageUrl)
    },

    // Event parser, ticket url getter
    {
        scope: every(typeEquals('event'), (resource) => resource.data?.ticketUrl),
        transform: (resource) => toResUrl(resource.data.ticketUrl, {
            canonicalUrl: resource.meta.url,
        })
    }
];