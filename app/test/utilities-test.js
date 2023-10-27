const test = require('tape');
const { equalAndDefined } = require('../libs/utilities');

test('Testing equalAndDefined', function(t) {
    t.plan(4);
  
    t.ok(equalAndDefined(5, 5), 'Should return true when both values are 5');
    t.notOk(equalAndDefined(undefined, 5), 'Should return false when first value is undefined');
    t.notOk(equalAndDefined(5, '5'), 'Should return false when types are different');
    t.notOk(equalAndDefined(5, 6), 'Should return false when values are different');
});
