const { from, concat, combineLatest, of, fromEvent, pipe, merge } = require('rxjs');
const { filter, mergeMap, map, tap } = require('rxjs/operators');
const db = require('./db');
const { getMatchingHandlers } = require('./handlers');

module.exports.resourceCrawler = async () => {

    const {
        Resource,
        resourceEvents,
        fromResourceFind
    } = await db.setup();

    const topResources$ =               fromResourceFind({ depth: 0 });
    const unhandledResources$ =         fromResourceFind({ handled: false, orphaned: false });
    const unhandledTopLevelResources$ = fromResourceFind({ handled: false, orphaned: false, depth: 0 });
    const orphanedResources$ =          fromResourceFind({ handled: false, orphaned: true });

    const resourceHandleTick = pipe(

        // Takes a resource, and outputs an array of that resource paired with each matched handler
        // Also marks resource as handled
        // If no matching handlers
        mergeMap((resource) => {
            const handlers = getMatchingHandlers(resource);
            
            // Update the resource's status
            if(!handlers.length) {
                resource.orphaned = true;
            } else {
                resource.handled = true;
            }

            resource.save();

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
                return cachedResources.map((cachedResource) => {
                    cachedResource.handled = false;
                    cachedResource.orphaned = false;
                    return cachedResource;
                });
            }

            // Handle the resource with handler, get the results
            const handleResults = await handler.handle(resource);
            // @TODO - If undefined, should this be special case?
            if(!handleResults) return [];
            // Create new resources
            return handleResults.map((newResourceData) => new Resource({
                ...newResourceData,
                parentHandlerHash: handler.hash,
                parentResource: resource._id,
                depth: resource.depth + 1,
            }));
        }),

        // Flatten
        mergeMap((resources) => resources),

        // Save
        mergeMap((resource) => resource.save()),
    );

    const newResources$ = fromEvent(resourceEvents, 'insert').pipe(
        filter(doc => !doc.handled && !doc.orphaned),
    );

    const updatedCachedResources$ = fromEvent(resourceEvents, 'update').pipe(
        filter(doc => doc.isFromCache() && !doc.handled && !doc.orphaned),
    );

    // WIP
    const theMainCrawler$ = concat(
        topResources$,
        merge(newResources$, updatedCachedResources$),
    ).pipe(
        resourceHandleTick,
    );

    return {
        theMainCrawler$,
        topResources$,
        unhandledResources$,
        unhandledTopLevelResources$,
        orphanedResources$,
        Resource,
    }
}