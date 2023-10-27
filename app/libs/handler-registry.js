const { hashFunction } = require('./utilities');

module.exports = () => {
    const handlers = [];

    const buildHandler = (handler) => {
        handler.hash = hashFunction(handler.transform);
        handler.id = Symbol();
        return handler;
    }

    const getHandlers = (resource) => {
        return handlers.filter(({scope}) => scope(resource));
    };

    const registerHandlers = (handlersToAdd) => {
        handlers.push(...handlersToAdd.map(buildHandler));
    }

    return {
        getHandlers,
        registerHandlers,
    }
}