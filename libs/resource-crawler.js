const { from, combineLatest, of, pipe, Subject, EMPTY, defer } = require('rxjs');
const { filter, mergeMap, expand, map, mergeAll } = require('rxjs/operators');
const { handledResultsToObservable } = require('./utilities.js');

module.exports.resourceCrawler = (options = {}) => {
    const {
        getHandlers = throwIfMissing`getHandlers`,
        db = throwIfMissing`db`,
    } = options;
    
    const {
        findResources,
        createResource,
        findResourcesCached,
    } = db;

    // Some possible observables to use
    const topResources$ = defer(() => from(findResources({ depth: 0 }))).pipe(
        mergeAll(),
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
                const cachedResources = await findResourcesCached(handler, resource);
                if(cachedResources.length) {
                    return from(cachedResources);
                }
            }

            // Handle the resource with handler, get the results
            const results = await handler.transform(resource);
            // Create new resources
            return handledResultsToObservable(results).pipe(
                map((newResourceData) => createResource(newResourceData, handler, resource))
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

    // Should we export these?
    // topResources$,
    // unhandledResources$,
    return {
        theMainCrawler$,
    }
}