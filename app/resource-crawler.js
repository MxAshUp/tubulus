const { from, combineLatest, isObservable, of, fromEvent, pipe } = require('rxjs');
const { filter, mergeMap, expand, map, mergeAll } = require('rxjs/operators');
const db = require('./db');
const { getMatchingHandlers } = require('./handlers');

const toObservable = (input) => {
    // If it's already an observable, return as-is
    if (isObservable(input)) {
      return input;
    }
    
    // If it's an array, convert to observable stream
    if (Array.isArray(input)) {
      return from(input);
    }

    // Return undefined means handler results in nothing
    // Need to have an empty resource end point to ensure cached
    if(typeof input === "undefined") {
        return of({
            type: 'EMPTY',
        })
    }
  
    // If it's an object, convert to an observable
    return of(input);
}

module.exports.resourceCrawler = async () => {

    const {
        Resource,
        resourceEvents,
        fromResourceFind
    } = await db.setup();

    // Some possible observables to use
    const topResources$ =               fromResourceFind({ depth: 0 });
    const unhandledResources$ =         fromResourceFind({ handled: false, orphaned: false });
    const unhandledTopLevelResources$ = fromResourceFind({ handled: false, orphaned: false, depth: 0 });
    const orphanedResources$ =          fromResourceFind({ handled: false, orphaned: true });

    const newResources$ = fromEvent(resourceEvents, 'insert').pipe(
        filter(doc => !doc.handled && !doc.orphaned),
    );

    const updatedCachedResources$ = fromEvent(resourceEvents, 'update').pipe(
        filter(doc => doc.isFromCache() && !doc.handled && !doc.orphaned),
    );


    // The main handler of a resource, outputs 0 to many resources
    const resourceHandleTick = pipe(

        // Takes a resource, and outputs an array of that resource paired with each matched handler
        // Also marks resource as handled
        // If no matching handlers
        mergeMap((resource) => {
            const handlers = getMatchingHandlers(resource);
            
            // @TODO - should be await
            resource.setHandled(handlers);

            return combineLatest([
                of(resource),
                from(handlers)
            ]);
        }),

        // Handle resource with handler, return original resource paired with new resource
        mergeMap(async ([resource, handler]) => {

            // Maybe the result of this handler already has cached resources
            const cachedResources = await Resource.getHandledCache(resource.id, handler.hash);
            if(cachedResources.length) {
                return toObservable(cachedResources);
            }

            // Handle the resource with handler, get the results
            const handleResults = await handler.handle(resource);
            // Create new resources
            return toObservable(handleResults).pipe(
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