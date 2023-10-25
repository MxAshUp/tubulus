// Type Checks
const typeEquals             = (type) => (resource) => resource.type === type;

// Combinators (predicate dispatch)
const some                   = (...predicates) => (val) => predicates.some((fn) => fn(val));
const every                  = (...predicates) => (val) => predicates.every((fn) => fn(val));

// "Binds" heach handler to all predicates
const bindScope = (...predicate) => (handlers) => handlers.map(({scope, ...handlerArgs}) => ({
    scope: predicate.length ? every(...predicate, scope) : scope,
    ...handlerArgs,
}));

module.exports = {
    typeEquals,
    some,
    every,
    bindScope,
};  