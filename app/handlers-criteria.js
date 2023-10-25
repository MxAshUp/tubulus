const { URL } = require('url');

// Type Checks
const typeEquals             = (type) => (resource) => resource.type === type;
const isEvent                = typeEquals('event');
const isHtml                 = typeEquals('html');
const isUrl                  = typeEquals('url');

// Combinators (predicate dispatch)
const some                   = (...predicates) => (val) => predicates.some((fn) => fn(val));
const every                  = (...predicates) => (val) => predicates.every((fn) => fn(val));

// Url utilities
const urlHasHost     = (url, host)        => new URL(url).host === host;
const urlMatchesPath = (url, pathPattern) => pathPattern.test(new URL(url).pathname);

// Calls a function on the url of a resource 
const testByUrl = (predicate) => (resource) => {
    if(isUrl(resource)) {
        return predicate(resource.data);
    } else if(resource.meta?.url) {
        return predicate(resource.meta?.url);
    }
}

// Url conditions
const pathMatches    = (pathPattern) => testByUrl((url) => urlMatchesPath(url, pathPattern));
const hostEquals     = (host)        => testByUrl((url) => urlHasHost(url, host));
const metaUrlMatches = (urlPattern)  => testByUrl((url) => urlPattern.test(url));

// Content-type matching
const metaContentTypeMatches = (contentTypePattern) => (resource) => contentTypePattern.test(resource.meta?.contentType);

// Complex Compound Conditions
const urlOfPageMatches        = (urlPattern) => every(isHtml, metaUrlMatches(urlPattern));
const isUnresolvedUrl         = every(isUrl, (resource) => !resource.meta?.resolved);
const isResolvedUrl           = every(isUrl, (resource) => resource.meta?.resolved);
const contentTypeOfUrlMatches = (contentTypePattern) => every(isResolvedUrl, metaContentTypeMatches(contentTypePattern));

module.exports = {
    urlHasHost,
    urlMatchesPath,
    testByUrl,
    typeEquals,
    some,
    every,
    hostEquals,
    pathMatches,
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