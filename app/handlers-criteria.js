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


const contentTypeOfUrlMatches = (contentTypePattern) => every(isResolvedUrl, metaContentTypeMatches(contentTypePattern));

module.exports = {
    typeEquals,
    some,
    every,
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