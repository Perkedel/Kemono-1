Kemono uses [semantic versioning](https://semver.org/). The "API" refers to both development configuration and literal HTTP API.

### v2.0
- *Breaking change:* Proxy support has been removed.
- Yiff.party support
- Shared Files support
- RSS feeds
- DLsite support
- "Artists" tab
- Board functionality
- New and improved Fanbox importer; stable and (mostly) API complete
- Missing content indicator for Patreon users
- New unified downloader with integrity checking and failure resistance
<details>
  <summary>Patch</summary>

  - kemono.party-specific documentation has been moved out of the repo.
  - SubscribeStar dates and sorting now fixed; importer now stable
  - Pages are now server-side rendered for efficiency
  - Better handling for deleted/unavailable products in Gumroad importer
  - Gumroad importer is now properly recursive
  - Thumbnail scraping improved in Gumroad importer
  - Discord importer now uses main download instead of proxy (which is usually lower quality)
  - Changes in thumbnail generator for reduced resource usage
  - Minor UI fixes
  - Better query indexing
  - Thumbnail generator now directly checks file contents instead of relying on naming
  - Fixed existing post query and version checking in Patreon importer
  - Whitespace is now removed from Discord channel ID string
  - Fixed Discord CSS
</details>

### v1.4
- New UI
- Search user posts
- Pagination
- Thumbnail generation
- Reimport flagging
- Ban implementation
<details>
  <summary>Patch</summary>

  - Fixed Gumroad importer
  - Fixed issue causing error when ID is not in the lookup database
  - Reworked API cache
  - Discord importer form is now combined with the main one in the UI
  - User and recent page now use Oboe.js
  - General code rewrites and cleanup
</details>

### v1.3.1
- Replaced Cloudscraper module
- Fixed SubscribeStar HTML scraper
- Fixed Gumroad HTML scraper
- Added proper fallback for missing Fanbox banner
- Lazy-load user headers on pages
- Lazy-load avatars and fresh names on home page
- Lookups now use a single endpoint
- New endpoint for name cache
- SubscribeStar importer now handles "Extend Subscription" message

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
- More fail-resistance in importer

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