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
        const newHandlers = handlersToAdd.map(buildHandler);
        handlers.push(...newHandlers);
        return newHandlers;
    }

    return {
        getHandlers,
        registerHandlers,
    }
}