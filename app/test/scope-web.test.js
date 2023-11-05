const { isHtml, isUrl, urlHasHost, urlMatchesPath, testByUrl, metaContentTypeMatches } = require('../libs/web/scopes'); // Replace with your actual file path

describe('isHtml()', () => {
  test('Should return true for type "html"', () => {
    expect(isHtml({ type: 'html' })).toBeTruthy();
  });

  test('Should return false for non-"html" type', () => {
    expect(isHtml({ type: 'event' })).toBeFalsy();
  });
});

describe('isUrl()', () => {
  test('Should return true for type "url"', () => {
    expect(isUrl({ type: 'url' })).toBeTruthy();
  });

  test('Should return false for non-"url" type', () => {
    expect(isUrl({ type: 'html' })).toBeFalsy();
  });
});

describe('urlHasHost function', () => {
  test('Should return true for matching host', () => {
    expect(urlHasHost('https://example.com/page', 'example.com')).toBeTruthy();
  });

  test('Should return false for non-matching host', () => {
    expect(urlHasHost('https://test.com/page', 'example.com')).toBeFalsy();
  });

  test('Should return true for matching host w/subdomain', () => {
    expect(urlHasHost('https://www.example.com/page', 'www.example.com')).toBeTruthy();
  });

  test('Should return false for host subdomain mismatch', () => {
    expect(urlHasHost('https://www.test.com/page', 'test.com')).toBeFalsy();
  });
});

describe('urlMatchesPath function', () => {
  test('Should return true for matching path', () => {
    expect(urlMatchesPath('https://example.com/page', /\/page/)).toBeTruthy();
  });

  test('Should return false for non-matching path', () => {
    expect(urlMatchesPath('https://example.com/another', /\/page/)).toBeFalsy();
  });

  test('Should return false for non-matching path using anchors', () => {
    expect(urlMatchesPath('https://example.com/page/extra', /^\/page$/)).toBeFalsy();
  });
});

describe('testByUrl function', () => {
  test('Should return true when resource.data meets the predicate', () => {
    const resourceWithData = { type: 'url', data: 'https://example.com' };
    const hasExampleHost = testByUrl(url => url === 'https://example.com');
    expect(hasExampleHost(resourceWithData)).toBeTruthy();
  });

  test('Should return true when resource.meta.url meets the predicate', () => {
    const resourceWithMeta = { type: 'html', meta: { url: 'https://example.com' } };
    const hasExampleHost = testByUrl(url => url === 'https://example.com');
    expect(hasExampleHost(resourceWithMeta)).toBeTruthy();
  });

  test('Should return false for a non-url resource that fails the predicate', () => {
    const nonUrlResource = { type: 'html', data: '<h1>Hello</h1>' };
    const hasExampleHost = testByUrl(url => url === 'https://example.com');
    expect(hasExampleHost(nonUrlResource)).toBeFalsy();
  });

  test('Should return false for a resource missing url information', () => {
    const resourceMissingUrl = { type: 'html' };
    const hasExampleHost = testByUrl(url => url === 'https://example.com');
    expect(hasExampleHost(resourceMissingUrl)).toBeFalsy();
  });
});

describe('metaContentTypeMatches function', () => {
  const isHtmlContent = metaContentTypeMatches(/text\/html/);

  test('Should return true for matching content-type', () => {
    const resourceWithHtmlContent = { meta: { contentType: 'text/html; charset=UTF-8' } };
    expect(isHtmlContent(resourceWithHtmlContent)).toBeTruthy();
  });

  test('Should return false for non-matching content-type', () => {
    const resourceWithJsonContent = { meta: { contentType: 'application/json' } };
    expect(isHtmlContent(resourceWithJsonContent)).toBeFalsy();
  });

  test('Should return false when content-type is missing', () => {
    const resourceMissingContentType = { meta: {} };
    expect(isHtmlContent(resourceMissingContentType)).toBeFalsy();
  });

  test('Should return false when meta object is missing', () => {
    const resourceMissingMeta = {};
    expect(isHtmlContent(resourceMissingMeta)).toBeFalsy();
  });
});
