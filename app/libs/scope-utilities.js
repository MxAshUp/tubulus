const { concatConditions } = require("./utilities");

// Type Checks
const typeEquals = (type) => (resource) => resource.type === type;

// Combinators (predicate dispatch)
const some = (...predicates) => concatConditions(predicates, ' || ');
const every = (...predicates) => concatConditions(predicates, ' && ');

// "Binds" each handler to all predicates
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