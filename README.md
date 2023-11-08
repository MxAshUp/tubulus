-- Thoughts on Handlers --

Need to cache resources by has of data, rather than id

Decide if resources in database are canonical to process, or just cache

Thinking it's just cache, but how do we pick up where we left off?


debug tools:
- need way to see unhandled resources
- tape console.log?

improve meta merging for sub resources

need to write test for sequence, make sure each one can reference the previous

error handling wrap for scope

Should resources mid-sequence be able to be handled by out-of-sequence handlers (like even the first step in the sequence?)