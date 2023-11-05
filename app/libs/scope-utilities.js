const { concatConditions, equalAndDefined } = require("./utilities");

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

const fromHandler = (handler) => (resource) => equalAndDefined(resource.$locals.handlerId, handler.id);

const sequence = (handlers) => handlers.reduce((handlers, handler, index) => {
    if(index === 0) {
        // The first handler scope is untouched
        handlers.push(handler);
    } else {
        // All other handlers are modified to only respond to the previous handler resource
        const fromPreviousHandler = fromHandler(handlers[handlers.length - 1]);
        handlers.push({
            ...handler,
            scope: handler.scope ? every(fromPreviousHandler, handler.scope) : fromPreviousHandler,
        });
    }
    return handlers;
}, []);

module.exports = {
    typeEquals,
    some,
    every,
    bindScope,
    fromHandler,
    sequence,
};