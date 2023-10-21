const { URL } = require('url');

const typeEquals             = (type) => (resource) => resource.type === type;

const some                   = (...predicates) => (val) => predicates.some(val);
const every                  = (...predicates) => (val) => predicates.some(val);

const isEvent                = typeEquals('event');
const isHtml                 = typeEquals('html');
const isUrl                  = typeEquals('url');

const metaUrlMatches         = (urlPattern) => (resource) => urlPattern.test(resource.meta?.url);
const metaContentTypeMatches = (contentTypePattern) => (resource) => contentTypePattern.test(resource.meta?.contentType);

const urlOfPageMatches = (urlPattern) => every(isHtml, metaUrlMatches(urlOfPageMatches));

const isUnresolvedUrl        = every(isUrl, (resource) => !resource.meta?.resolved);
const isResolvedUrl          = every(isUrl, (resource) => !resource.meta?.resolved);

const urlHasHost = (url, host) => new URL(url).host === host;

const urlMatchesPath = (url, pathPattern) => pathPattern.test(new URL(url).pathname);

const hostEquals = (host) => (resource) => {
    if(isUrl(resource)) {
        return urlHasHost(resource.data, host);
    }
    if(resource.meta?.url) {
        if(urlHasHost(resource.meta?.url, host)) return true;
    }
    if(resource.meta?.canonicalUrl) {
        return urlHasHost(resource.meta?.canonicalUrl, host);
    }
}

const contentTypeOfUrlMatches = (contentTypePattern) => every(isResolvedUrl, metaContentTypeMatches(contentTypePattern));

module.exports = {
    typeEquals,
    some,
    every,
    hostEquals,
    urlMatchesPath,
    isEvent,
    isHtml,
    isUrl,
    metaUrlMatches,
    metaContentTypeMatches,
    urlOfPageMatches,
    isUnresolvedUrl,
    isResolvedUrl,
    contentTypeOfUrlMatches,
};