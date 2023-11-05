const { equalAndDefined } = require('../libs/utilities');

describe('Testing equalAndDefined', () => {
  test('Should return true when both values are 5', () => {
    expect(equalAndDefined(5, 5)).toBeTruthy();
  });

  test('Should return false when first value is undefined', () => {
    expect(equalAndDefined(undefined, 5)).toBeFalsy();
  });

  test('Should return false when types are different', () => {
    expect(equalAndDefined(5, '5')).toBeFalsy();
  });

  test('Should return false when values are different', () => {
    expect(equalAndDefined(5, 6)).toBeFalsy();
  });
});
