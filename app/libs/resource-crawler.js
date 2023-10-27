const { from, combineLatest, of, fromEvent, pipe, Subject, EMPTY } = require('rxjs');
const { filter, mergeMap, expand, map, mergeAll } = require('rxjs/operators');
const { handledResultsToObservable } = require('./utilities.js');

module.exports.resourceCrawler = (options = {}) => {
    const {
        getHandlers = throwIfMissing`getHandlers`,
        db = throwIfMissing`db`,
    } = options;
    
    const {
        Resource,
        resourceEvents,
        fromResourceFind
    } = db;

    // Some possible observables to use
    const topResources$ =               fromResourceFind({ depth: 0 });
    const unhandledTopLevelResources$ = fromResourceFind({ handled: false, orphaned: false, depth: 0 });
    const orphanedResources$ =          fromResourceFind({ handled: false, orphaned: true });

    const newResources$ = fromEvent(resourceEvents, 'insert').pipe(
        filter(doc => !doc.handled && !doc.orphaned),
    );

    const updatedCachedResources$ = fromEvent(resourceEvents, 'update').pipe(
        filter(doc => doc.isFromCache() && !doc.handled && !doc.orphaned),
    );

    // Resources emitted with no handler
    const unhandledResources$ = new Subject();

    // The main handler of a resource, outputs 0 to many resources
    const resourceHandleTick = pipe(
        // Nothing to do with the special EMPTY types
        filter(({type}) => type !== "EMPTY"),
        // Takes a resource, and outputs an array of that resource paired with each matched handler
        // Also marks resource as handled
        // If no matching handlers
        mergeMap((resource) => {
            const handlers = getHandlers(resource);
            
            // @TODO - should be await
            resource.setHandled(handlers);

            if(!handlers.length) {
                unhandledResources$.next(resource);
                return EMPTY;
            }

            return combineLatest([
                of(resource),
                from(handlers)
            ]);
        }),

        // Handle resource with handler, return original resource paired with new resource
        mergeMap(async ([resource, handler]) => {

            // Maybe the result of this handler already has cached resources
            if(!handler.dontCache) {
                const cachedResources = await Resource.getHandledCache(handler, resource);
                if(cachedResources.length) {
                    return from(cachedResources);
                }
            }

            // Handle the resource with handler, get the results
            const results = await handler.transform(resource);
            // Create new resources
            return handledResultsToObservable(results).pipe(
                map((newResourceData) => Resource.create(newResourceData, handler, resource))
            );
        }),

        // Flatten
        mergeAll(),

        // Save
        mergeMap((resource) => resource.save()),
    );

    // Recursively take the output of resourceHandleTick and feed it into itself
    const resourceHandleRecursive = pipe(
        expand((resource) => of(resource).pipe(resourceHandleTick)),
    );

    const theMainCrawler$ = topResources$.pipe(resourceHandleRecursive);

    return {
        theMainCrawler$,
        topResources$,
        unhandledResources$,
        unhandledTopLevelResources$,
        orphanedResources$,
        newResources$,
        updatedCachedResources$,
        Resource,
    }
}