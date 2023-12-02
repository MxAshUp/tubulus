const { from, combineLatest, of, pipe, EMPTY } = require('rxjs');
const { filter, mergeMap, expand, mergeAll } = require('rxjs/operators');
const { throwIfMissing } = require('./utilities.js');
const { notResNull } = require('./resource-utilities.js');
const { handlerLookup } = require('./handler-utilities.js');

module.exports.resourceHandlerOperator = (handleResourceFn = throwIfMissing`handleResourceFn`) => (handlers = throwIfMissing`handlers`) => {
    const getHandlers = handlerLookup(handlers);
    
    // The main handler of a resource, outputs 0 to many resources
    const resourceHandleTick = pipe(
        // Nothing to do with the special null resources
        filter(notResNull),
        // Takes a resource, and outputs an array of that resource paired with each matched handler
        mergeMap((resource) => {
            const handlers = getHandlers(resource);

            if(!handlers.length) {
                return EMPTY;
            }

            return combineLatest([
                of(resource),
                from(handlers)
            ]);
        }),

        // Handle resource with handler, return original resource paired with new resource
        mergeMap(([resource, handler]) => handleResourceFn(resource, handler)),

        // Flatten
        mergeAll(),

        // Commit to storage
        mergeMap((resource) => resource.commit()),
    );

    // Recursively take the output of resourceHandleTick and feed it into itself
    return pipe(
        expand((resource) => of(resource).pipe(resourceHandleTick)),
    );
}