![Tubulus logo](/logo.svg)

## Work in Progress ##

TODO
 - [ ] Index resources by hash of data, rather than object id
 - [ ] Save crawl position in db? (involves .handled, etc)
 - [x] Wrap errors and turn into resource
 - [x] eslint

TOOLS
-  [ ] need way to see unhandled resources

THOUGHTS
 - Should resources mid-sequence be able to be handled by out-of-sequence handlers (like even the first step in the sequence?). Ie exclusive privilege scope?
 - How to handle errors throw during 'scope'?
