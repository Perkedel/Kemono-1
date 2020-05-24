Kemono uses [semantic versioning](https://semver.org/).

### v1.3.1
- Made small style changes to user header
- Better handling of Fanbox users without header images in client
- Fixed Gumroad importer for UI changes
- Multiple proxy support

### v1.3
- Added SubscribeStar support
- Update Fanbox-related scripts for new domain (fanbox.cc)
- More fail-resistance in Patreon importer
- All API requests can now use [node-unblocker](https://github.com/nfriedly/node-unblocker) proxies
- Tidied up expander/lazy load code
- Fixed promise rejections
- Fanbox importer now uses `p-retry`
- Fixed small limiting issue with Discord service query
- Discord importer now uses messages/scroll API for faster and more efficient imports
- Discord importer no longer requires server ID
- Fixed skip amount of all "load more" buttons

### v1.2.2
- Queried fields are now properly indexed
- Lookup now uses prefix expression with case-sensitivity in order to support [indexing](https://docs.mongodb.com/manual/reference/operator/query/regex/#index-use)
- Better handling of v1 posts in indexer
- Patreon importer now handles multiple pages at a time
- Gumroad proxy now caches for 1 year to avoid 404s
- Increment current month in Discord importer to prevent missed queries

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