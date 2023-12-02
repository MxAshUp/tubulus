const { pipe } = require('rxjs');
const { filter, mergeMap, mergeAll } = require('rxjs/operators');
const { throwIfMissing } = require('./utilities.js');
const { notResNull } = require('./resource-utilities.js');

module.exports.resourceSequenceOperator = (handleResourceFn = throwIfMissing`handleResourceFn`) => (handlers = throwIfMissing`handlers`) => {
    return pipe(
        ...handlers.map((handler) => pipe(
            // Nothing to do with the special null resources
            filter(notResNull),
    
            // Make sure it passes scope (if scope exists)
            filter((resource) => !handler.scope || handler.scope(resource)),
    
            // Handle resource with handler, return original resource paired with new resource
            mergeMap((resource) => handleResourceFn(resource, handler)),
    
            // Flatten
            mergeAll(),
    
            // Commit to storage
            mergeMap((resource) => resource.commit()),
        ))
    );
}