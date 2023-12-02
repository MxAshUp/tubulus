const { of, map, from, isObservable } = require("rxjs");
const { toResError, resNull } = require("./resource-utilities");
const { hashFunction } = require('./utilities');

const catchTransformErrors = async (callFn) => {
    try {
        return await callFn();
    } catch (error) {
        return toResError(error);
    }
}

const handledResultsToObservable = (input) => {
    // If it's already an observable, return as-is
    if (isObservable(input)) {
      return input;
    }
    
    // If it's an array, convert to observable stream
    if (Array.isArray(input)) {
      return from(input);
    }

    // Return undefined means handler results in nothing
    if(typeof input === "undefined") {
        return of(resNull())
    }
  
    // If it's an object, convert to an observable
    return of(input);
}

module.exports.handlerFromPipe = (scope, operatorFunction) => ({
    scope,
    transform: (resource) => of(resource).pipe(operatorFunction)
});

const buildHandler = (handler) => {
    handler.hash = hashFunction(handler.transform);
    handler.id = Symbol();
    return handler;
}

module.exports.handlerLookup = (handlersToAdd) => {
    const handlers = handlersToAdd.map(buildHandler);

    // Return the lookup function
    return (resource) => handlers.filter(({scope}) => scope(resource));
}

module.exports.handleResourceInterface = (findCached, create) => async (resource, handler) => {

    // Maybe the result of this handler already has cached resources
    if(!handler.dontCache) {
        const cachedResources = await findCached(handler, resource);
        if(cachedResources.length) {
            return from(cachedResources);
        }
    }

    // Handle the resource with handler, get the results
    const results = await catchTransformErrors(() => handler.transform(resource));
    // Create new resources
    return handledResultsToObservable(results).pipe(
        map((newResourceData) => create(newResourceData, handler, resource))
    );
}