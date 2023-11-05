const { typeEquals, every, some, sequence } = require('../libs/scope-utilities'); // Replace with your actual file path
const handlerRegistry = require('../libs/handler-registry');

describe('Utility functions', () => {
  test('typeEquals()', () => {
    const isMyType = typeEquals('myType');
    expect(isMyType({ type: 'myType' })).toBe(true);
    expect(isMyType({ type: 'notMyType' })).toBe(false);
    expect(isMyType({})).toBe(false);
  });

  test('every()', () => {
    const allPositive = every(x => x > 0, x => x !== 0);
    expect(allPositive(5)).toBe(true);
    expect(allPositive(-5)).toBe(false);
    expect(allPositive(0)).toBe(false);

    const isPositive = every(x => x > 0);
    expect(isPositive(5)).toBe(true);
    expect(isPositive(-5)).toBe(false);
  });

  test('some()', () => {
    const anyPositive = some(x => x > 0, x => x < 0);
    expect(anyPositive(5)).toBe(true);
    expect(anyPositive(-5)).toBe(true);
    expect(anyPositive(0)).toBe(false);

    const isPositive = some(x => x > 0);
    expect(isPositive(5)).toBe(true);
    expect(isPositive(-5)).toBe(false);
  });

  test('concatConditions - nested', () => {
    const isEven = x => x % 2 === 0;
    const isPositive = x => x > 0;
    const isGreaterThan10 = x => x > 10;

    const complexCondition = every(
      isEven,
      some(isPositive, isGreaterThan10),
      every(isGreaterThan10, isPositive)
    );

    expect(complexCondition(12)).toBe(true);
    expect(complexCondition(2)).toBe(false);
    expect(complexCondition(-12)).toBe(false);
  });

  test('concatConditions - single optimized', () => {
    const isEven = every(x => x % 2 === 0);

    expect(isEven(12)).toBe(true);
    expect(isEven(3)).toBe(false);
    expect(isEven(1)).toBe(false);
  });

  describe('Testing sequence function', () => {
    const handler0 = { transform: () => 12, scope: (resource) => resource.data > 5 };
    const handler1 = { transform: () => 112, scope: (resource) => resource.data < 10 };
    const handler2 = { transform: () => 212 }; // No scope defined

    const registry = handlerRegistry();
    const sequencedHandlers = registry.registerHandlers(sequence([handler0, handler1, handler2]));

    const resource0 = { $locals: { _testName: 'resource0', handlerId: undefined }, data: 6 };
    const resource1 = { $locals: { _testName: 'resource1', handlerId: sequencedHandlers[0].id }, data: 4 };
    const resource2 = { $locals: { _testName: 'resource2', handlerId: sequencedHandlers[1].id }, data: 8 };
    const resource3 = { $locals: { _testName: 'resource3', handlerId: sequencedHandlers[2].id } };

    test('Handler scope validations', () => {
      expect(sequencedHandlers[0].scope(resource0)).toBe(true);
      expect(sequencedHandlers[1].scope(resource0)).toBe(false);
      expect(sequencedHandlers[2].scope(resource0)).toBe(false);
      
      expect(sequencedHandlers[0].scope(resource1)).toBe(false);
      expect(sequencedHandlers[1].scope(resource1)).toBe(true);
      expect(sequencedHandlers[2].scope(resource1)).toBe(false);
      
      expect(sequencedHandlers[0].scope(resource2)).toBe(true);
      expect(sequencedHandlers[1].scope(resource2)).toBe(false);
      expect(sequencedHandlers[2].scope(resource2)).toBe(true);
      
      expect(sequencedHandlers[0].scope(resource3)).toBe(false);
      expect(sequencedHandlers[1].scope(resource3)).toBe(false);
      expect(sequencedHandlers[2].scope(resource3)).toBe(false);
    });

    test('Handler registry sequence behavior', () => {
      expect(registry.getHandlers(resource0)).toEqual([sequencedHandlers[0]]);
      expect(registry.getHandlers(resource1)).toEqual([sequencedHandlers[1]]);
      expect(registry.getHandlers(resource2)).toEqual([sequencedHandlers[0], sequencedHandlers[2]]);
      expect(registry.getHandlers(resource3)).toEqual([]);
    });
  });
});