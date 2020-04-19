### v1.2.2
- Queried fields are now properly indexed
- Lookup now uses prefix expression with case-sensitivity in order to support [indexing](https://docs.mongodb.com/manual/reference/operator/query/regex/#index-use)
- Better handling of v1 posts in indexer
- Patreon importer now handles multiple pages at a time

### v1.2.1
- Removes accidental debug left in last release
- Code properly includes limit in API request

### v1.2
- Added service query selection
- Multiple API endpoints now have hard limits on how many entries the client can ask for at once. If the limit is exceeded, Kemono will revert to its' defaults.
- Code has been tidied up and [standardized](https://github.com/standard/semistandard).
- Legacy scripts have been removed.
- Captcha solver has been removed.

### v1.1
- Issues causing duplicate lookup entries are now fixed
- Added random user button *(only works with Patreon for now)*

### v1.0
Changes began tracking here.