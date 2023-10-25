const { hashFunction } = require('./utilities');

module.exports = () => {
    const handlers = [];

    const hashHandler = (handler) => ({
        ...handler,
        hash: hashFunction(handler.transform)
    });

    const getHandlers = (resource) => {
        return handlers.filter(({scope}) => scope(resource));
    };

    const registerHandlers = (handlersToAdd) => {
        handlers.push(...handlersToAdd.map(hashHandler));
    }

    return {
        getHandlers,
        registerHandlers,
    }
}