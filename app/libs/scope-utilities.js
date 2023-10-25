// Type Checks
const typeEquals             = (type) => (resource) => resource.type === type;

// Combinators (predicate dispatch)
const some                   = (...predicates) => (resource) => predicates.some((fn) => fn(resource));
const every                  = (...predicates) => (resource) => predicates.every((fn) => fn(resource));

// "Binds" heach handler to all predicates
const bindScope = (...predicate) => (handlers) => handlers.map(({scope, ...handlerArgs}) => ({
    scope: scope ? every(...predicate, scope) : every(...predicate),
    ...handlerArgs,
}));

module.exports = {
    typeEquals,
    some,
    every,
    bindScope,
};  