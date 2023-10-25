// Type Checks
const typeEquals             = (type) => (resource) => resource.type === type;

// Combinators (predicate dispatch)
const some                   = (...predicates) => (val) => predicates.some((fn) => fn(val));
const every                  = (...predicates) => (val) => predicates.every((fn) => fn(val));

module.exports = {
    typeEquals,
    some,
    every,
};