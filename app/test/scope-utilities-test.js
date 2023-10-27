const test = require('tape');
const { typeEquals, every, some, sequence } = require('../libs/scope-utilities'); // Replace with your actual file path
const handlerRegistry = require('../libs/handler-registry');

test('typeEquals()', (t) => {
    t.plan(3);
    
    const isMyType = typeEquals('myType');
    t.ok(isMyType({ type: 'myType' }), 'Should return true for matching type');
    t.notOk(isMyType({ type: 'notMyType' }), 'Should return false for non-matching type');
    t.notOk(isMyType({}), 'Should return false for missing type');
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

test('concatConditions - nested', (t) => {
    t.plan(3);

    const isEven = x => x % 2 === 0;
    const isPositive = x => x > 0;
    const isGreaterThan10 = x => x > 10;

    const complexCondition = every(
        isEven,
        some(isPositive, isGreaterThan10),
        every(isGreaterThan10, isPositive)
    );

    t.true(complexCondition(12), 'Should return true for 12');
    t.false(complexCondition(2), 'Should return false for 2');
    t.false(complexCondition(-12), 'Should return false for -12');
    t.end();
});

test('concatConditions - single optimized', (t) => {
    t.plan(3);
    const isEven = every(x => x % 2 === 0);

    t.true(isEven(12), 'Should return true for 12');
    t.false(isEven(3), 'Should return false for 2');
    t.false(isEven(1), 'Should return false for -12');
    t.end();
});

test('Testing sequence function', function(t) {
    // Mock handlers and resources
    const handler0 = { transform: () => 12, scope: (resource) => resource.data > 5 };
    const handler1 = { transform: () => 112, scope: (resource) => resource.data < 10 };
    const handler2 = { transform: () => 212 }; // No scope defined
  
    const registry = handlerRegistry();
    const sequencedHandlers = registry.registerHandlers(sequence([handler0, handler1, handler2]));

    const resource0 = { $locals: { _testName: 'resource0', handlerId: undefined }, data: 6 };
    const resource1 = { $locals: { _testName: 'resource1', handlerId: sequencedHandlers[0].id }, data: 4 };
    const resource2 = { $locals: { _testName: 'resource2', handlerId: sequencedHandlers[1].id }, data: 8 };
    const resource3 = { $locals: { _testName: 'resource3', handlerId: sequencedHandlers[2].id } };
    
    t.ok(    sequencedHandlers[0].scope(resource0), 'Handler 0 should accept resource0 that is first part of sequence with data > 5');
    t.notOk( sequencedHandlers[1].scope(resource0), 'Handler 1 should not accept resource0, which belongs to the start of the sequence');
    t.notOk( sequencedHandlers[2].scope(resource0), 'Handler 2 should not accept resource0, which belongs to the start of the sequence');
    
    t.notOk( sequencedHandlers[0].scope(resource1), 'Handler 0 should not accept resource1, which is already in the sequence');
    t.ok(    sequencedHandlers[1].scope(resource1), 'Handler 1 should work with resource created from previous handler in sequence');
    t.notOk( sequencedHandlers[2].scope(resource1), 'Handler 2 should not accept resource1, which belongs to the first handler in sequence');
    
    t.ok(    sequencedHandlers[0].scope(resource2), 'Handler 0 should accept resource2, even though it\'s part of the sequence, it can be recursive.');
    t.notOk( sequencedHandlers[1].scope(resource2), 'Handler 1 should not accept resource2, which belongs to itself');
    t.ok(    sequencedHandlers[2].scope(resource2), 'Handler 2 should work with resource created from previous handler in sequence');
    
    t.notOk( sequencedHandlers[0].scope(resource3), 'Handler 0 should not accept resource3, which is the final output of the sequence');
    t.notOk( sequencedHandlers[1].scope(resource3), 'Handler 1 should not accept resource3, which is the final output of the sequence');
    t.notOk( sequencedHandlers[2].scope(resource3), 'Handler 2 should not accept resource3, which is the final output of the sequence');

    t.same(registry.getHandlers(resource0), [sequencedHandlers[0]], 'registry.getHandlers - Should return only handler 0 for resource0');
    t.same(registry.getHandlers(resource1), [sequencedHandlers[1]], 'registry.getHandlers - Should return only handler 1 for resource1');
    t.same(registry.getHandlers(resource2), [sequencedHandlers[0], sequencedHandlers[2]], 'registry.getHandlers - Should return handler 0 and 2 for resource2');
    t.same(registry.getHandlers(resource3), [], 'registry.getHandlers - Should return empty array for resource3');

    t.end();
});