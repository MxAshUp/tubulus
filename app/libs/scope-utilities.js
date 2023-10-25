const { invokeWithArgs } = require("./utilities");

// Type Checks
const typeEquals             = (type) => (resource) => resource.type === type;

// Combinators (predicate dispatch)
const some                   = (...predicates) => (resource) => predicates.some(invokeWithArgs(resource));
const every                  = (...predicates) => (resource) => predicates.every(invokeWithArgs(resource));

// "Binds" heach handler to all predicates
const bindScope = (...predicates) => (handlers) => handlers.map(({scope, ...handlerArgs}) => ({
    scope: scope ? every(...predicates, scope) : every(...predicates),
    ...handlerArgs,
}));

module.exports = {
    typeEquals,
    some,
    every,
    bindScope,
};  