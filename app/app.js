const { from, concat, combineLatest, of, fromEvent, pipe } = require('rxjs');
const { filter, mergeMap, map } = require('rxjs/operators');
const db = require('./db');
const { getMatchingHandlers } = require('./handlers');

const {
    Resource,
    resourceEvents
} = db.setup();

(async() => {
    console.log("INITIAL:", (await Resource.find({})));
    await Resource.deleteMany({});
    console.log("INITIAL:", (await Resource.find({})).length);
    setTimeout(() => {
        console.log("INSERT YO>....");
        new Resource({
            type: 'url',
            data: 'https://en.wikipedia.org/wiki/Special:Random',
        }).save();
    }, 2000);
    
    // mongoose.disconnect();
})();

// Create an observable of unhandled resources already in the database
// TODO - maybe other criteria like depth, etc...
const initialResources$ = from(Resource.find({ handled: false, orphaned: false })).pipe(
    mergeMap(resources => from(resources))
);

// Create an observable for new unhandled resources using change streams
const newResources$ = fromEvent(resourceEvents, 'insert').pipe(
    filter(doc => !doc.handled && !doc.orphaned),
);

const resourceHandlePipe = pipe(
    // Find matching handlers, return handler/resource pair
    mergeMap((resource) => {
        const handlers = getMatchingHandlers(resource);
        // Mark the resource as handled or saved

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
    mergeMap(([resource, handler]) => 
        // TODO async-ify handle()
        from(handler.handle(resource)).pipe(
            mergeMap(newResources => {
                return combineLatest([
                    of(resource),
                    from(newResources)
                ]);
            }),
            // // TODO - try catch
            // // If error, make error resource!
        )
    ),
    // Bring in parent resource data, before finalizing data to be inserted
    map(([parentResource, newResourceData]) => ({
        ...newResourceData,
        parentResource: parentResource._id,
        // TODO - maybe respect option like "noDepthInc"
        // TODO - maybe respect option like "hasNoParent"?
        depth: parentResource.depth + 1,
    })),
    mergeMap(async (newData) => {
        return await new Resource(newData).save();
    }),
);

// Create a stream that periodically checks for unhandled resources
concat(initialResources$, newResources$).pipe(resourceHandlePipe).subscribe();