const test = require('tape');
const { typeEquals, every, some } = require('../libs/criteria'); // Replace with your actual file path
const { isHtml, isUrl, urlHasHost, urlMatchesPath, testByUrl, metaContentTypeMatches } = require('../libs/criteria-web'); // Replace with your actual file path

test('typeEquals()', (t) => {
    t.plan(3);
    
    const isMyType = typeEquals('myType');
    t.ok(isMyType({ type: 'myType' }), 'Should return true for matching type');
    t.notOk(isMyType({ type: 'notMyType' }), 'Should return false for non-matching type');
    t.notOk(isMyType({}), 'Should return false for missing type');
});

test('isHtml()', (t) => {
    t.plan(2);
    
    t.ok(isHtml({ type: 'html' }), 'Should return true for type "html"');
    t.notOk(isHtml({ type: 'event' }), 'Should return false for non-"html" type');
});

test('isUrl()', (t) => {
    t.plan(2);
    
    t.ok(isUrl({ type: 'url' }), 'Should return true for type "url"');
    t.notOk(isUrl({ type: 'html' }), 'Should return false for non-"url" type');
});

test('every()', (t) => {
    t.plan(5);
    
    const allPositive = every(x => x > 0, x => x !== 0);
    t.ok(allPositive(5), 'Should return true when all predicates pass');
    t.notOk(allPositive(-5), 'Should return false when any predicate fails');
    t.notOk(allPositive(0), 'Should return false when any predicate fails');
    
    const isPositive = every(x => x > 0);
    t.ok(isPositive(5), 'Should return true when the single predicate passes');
    t.notOk(isPositive(-5), 'Should return false when the single predicate fails');
});

test('some()', (t) => {
    t.plan(5);
    
    const anyPositive = some(x => x > 0, x => x < 0);
    t.ok(anyPositive(5), 'Should return true when any predicate passes');
    t.ok(anyPositive(-5), 'Should return true when any predicate passes');
    t.notOk(anyPositive(0), 'Should return false when all predicates fail');
    
    const isPositive = some(x => x > 0);
    t.ok(isPositive(5), 'Should return true when the single predicate passes');
    t.notOk(isPositive(-5), 'Should return false when the single predicate fails');
});

test('urlHasHost function', (t) => {
    t.plan(4);
    
    t.ok(urlHasHost('https://example.com/page', 'example.com'), 'Should return true for matching host');
    t.notOk(urlHasHost('https://test.com/page', 'example.com'), 'Should return false for non-matching host');
    
    t.ok(urlHasHost('https://www.example.com/page', 'www.example.com'), 'Should return true for matching host w/subdomain');
    t.notOk(urlHasHost('https://www.test.com/page', 'test.com'), 'Should return false for host subdomain mismatch');
});

test('urlMatchesPath function', (t) => {
    t.plan(3);
    
    t.ok(urlMatchesPath('https://example.com/page', /\/page/), 'Should return true for matching path');
    t.notOk(urlMatchesPath('https://example.com/another', /\/page/), 'Should return false for non-matching path');
    t.notOk(urlMatchesPath('https://example.com/page/extra', /^\/page$/), 'Should return false for non-matching path using anchors');
});

test('testByUrl function', (t) => {
    t.plan(4);
    
    // Test with a resource that has data
    const resourceWithData = { type: 'url', data: 'https://example.com' };
    const hasExampleHost = testByUrl(url => url === 'https://example.com');
    t.ok(hasExampleHost(resourceWithData), 'Should return true when resource.data meets the predicate');
    
    // Test with a resource that has meta.url
    const resourceWithMeta = { type: 'html', meta: { url: 'https://example.com' } };
    t.ok(hasExampleHost(resourceWithMeta), 'Should return true when resource.meta.url meets the predicate');
    
    // Test with a non-url resource
    const nonUrlResource = { type: 'html', data: '<h1>Hello</h1>' };
    t.notOk(hasExampleHost(nonUrlResource), 'Should return false for a non-url resource that fails the predicate');
    
    // Test with resource missing the url info
    const resourceMissingUrl = { type: 'html' };
    t.notOk(hasExampleHost(resourceMissingUrl), 'Should return false for a resource missing url information');
});

test('metaContentTypeMatches function', (t) => {
    t.plan(4);
    
    // Test when content-type matches the pattern
    const isHtmlContent = metaContentTypeMatches(/text\/html/);
    const resourceWithHtmlContent = { meta: { contentType: 'text/html; charset=UTF-8' } };
    t.ok(isHtmlContent(resourceWithHtmlContent), 'Should return true for matching content-type');
    
    // Test when content-type doesn't match the pattern
    const resourceWithJsonContent = { meta: { contentType: 'application/json' } };
    t.notOk(isHtmlContent(resourceWithJsonContent), 'Should return false for non-matching content-type');
    
    // Test when content-type is missing
    const resourceMissingContentType = { meta: {} };
    t.notOk(isHtmlContent(resourceMissingContentType), 'Should return false when content-type is missing');
    
    // Test when meta itself is missing
    const resourceMissingMeta = {};
    t.notOk(isHtmlContent(resourceMissingMeta), 'Should return false when meta object is missing');
});