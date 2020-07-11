const { transliterate } = require('transliteration');

const shell = (html, props = {}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Kemono</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/normalize.css@8.0.1/normalize.css">
      ${props.compatibility ? '<link rel="stylesheet" type="text/css" href="/css/compatibility.css">' : ''}
      ${props.compatibility ? '' : '<link rel="stylesheet" type="text/css" href="/css/index.css">'}
      ${props.discord ? '<link rel="stylesheet" type="text/css" href="/css/discord.css">' : ''}
      <meta name="service" content="${props.service}"/>
    </head>
    <body>
      ${html}
    </body>
  </html>
`;

const header = data => `
  <ul class="header">
    <li><a href="/">Kemono</a></li>
    <li ${data.currentPage === 'artists' ? 'class="current-page"' : ''}><a href="/artists">Artists</a></li>
    <li ${data.currentPage === 'posts' ? 'class="current-page"' : ''}><a href="/posts">Posts</a></li>
    <li ${data.currentPage === 'help' ? 'class="current-page"' : ''}><a href="/help">Help</a></li>
    <li><a href="https://liberapay.com/kemono.party" target="_blank">Donate</a></li>
  </ul>
`;

const subheader = data => ({
  posts: `
    <ul class="subheader">
      <li><a href="/posts">List</a></li>
      <li><a href="/importer">Import</a></li>
      <li><a href="/random">Random</a></li>
      <li><a href="/help/posts">Help</a></li>
    </ul>
  `,
  artists: `
    <ul class="subheader">
      <li><a href="">List</a></li>
    </ul>
  `
})[data.currentPage];

const artists = data => shell(`
  <div class="main" id="main">
    ${header({ currentPage: 'artists' })}
    ${subheader({ currentPage: 'artists' })}
    <div class="page" id="page">
      <form
        autocomplete="off"
        class="search-form"
        novalidate="novalidate"
        action="/artists"
        accept-charset="UTF-8"
        method="get"
      >
        <div>
          <label for="q">Name</label>
          <input
            type="text"
            name="q"
            id="q"
            autocomplete="off"
            value="${data.query.q || ''}"
          >
          <small class="subtitle" style="margin-left: 5px;">Leave blank to list all</small>
        </div>
        <div>
          <label for="service">Service</label>
          <select id="service" name="service">
            <option value="">All</option>
            <option value="patreon" ${data.query.service === 'patreon' ? 'selected' : ''}>Patreon</option>
            <option value="fanbox" ${data.query.service === 'fanbox' ? 'selected' : ''}>Pixiv Fanbox</option>
            <option value="gumroad" ${data.query.service === 'gumroad' ? 'selected' : ''}>Gumroad</option>
            <option value="subscribestar" ${data.query.service === 'subscribestar' ? 'selected' : ''}>SubscribeStar</option>
            <option value="discord" ${data.query.service === 'discord' ? 'selected' : ''}>Discord</option>
          </select>
        </div>
        <div>
          <label for="sort_by">Sort by</label>
          <select id="sort_by" name="sort_by">
            <option value="_id" ${data.query.sort_by === '_id' ? 'selected' : ''}>Date Indexed</option>
            <option value="name" ${data.query.sort_by === 'name' ? 'selected' : ''}>Alphabetical Order</option>
            <option value="service" ${data.query.sort_by === 'service' ? 'selected' : ''}>Service</option>
          </select>
          <select name="order">
            <option value="asc">Ascending</option>
            <option value="desc" ${data.query.order === 'desc' ? 'selected' : ''}>Descending</option>
          </select>
        </div>
        <div>
          <label for="limit">Limit</label>
          <input
            type="text"
            name="limit"
            id="limit"
            autocomplete="off"
            value="${data.query.limit || ''}"
          >
          <small class="subtitle" style="margin-left: 5px;">Up to 250, default 50</small>
        </div>
        <input type="submit" name="commit" value="Search" data-disable-with="Search">
      </form>
      <table class="search-results" width="100%">
        <thead>
          <tr>
            <th width="50px">Icon</th>
            <th>Name</th>
            <th>Transliteration</th>
            <th>Service</th>
          </tr>
        </thead>
        <tbody>
          ${data.results.length === 0 ? `
            <tr>
              <td>
                <div></div>
              </td>
              <td class="subtitle">No artists found for your query.</td>
            </tr>
          ` : ''}
          ${data.results.map(artist => `
            <tr class="artist-row">
              <td>
                <div class="user-icon" data-user="${artist.id}" data-service="${artist.service}"></div>
              </td>
              <td>
                ${({
                  patreon: `<a href="/user/${artist.id}">${artist.name}</a>`,
                  fanbox: `<a href="/fanbox/user/${artist.id}">${artist.name}</a>`,
                  subscribestar: `<a href="/subscribestar/user/${artist.id}">${artist.name}</a>`,
                  gumroad: `<a href="/gumroad/user/${artist.id}">${artist.name}</a>`,
                  discord: `<a href="/discord/server/${artist.id}">${artist.name}</a>`
                })[artist.service]}
              </td>
              <td>
                <div>${transliterate(artist.name) !== artist.name ? transliterate(artist.name) : '<span class="subtitle">(N/A)</span>'}</div>
              </td>
              <td>
                ${({
                  patreon: 'Patreon',
                  fanbox: 'Pixiv Fanbox',
                  subscribestar: 'SubscribeStar',
                  gumroad: 'Gumroad',
                  discord: 'Discord'
                })[artist.service]}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ${data.results.length !== 0 ? `
    <script src="https://unpkg.com/unfetch@4.1.0/polyfill/index.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>
    <script src="/js/artists.js"></script>
  ` : ''}
`);

const user = data => shell(`
  <div class="main" id="main">
    ${header({ currentPage: 'posts' })}
    ${subheader({ currentPage: 'posts' })}
    <div class="views">
      <div class="sidebar">
        <input
          id="search-input"
          type="text"
          placeholder="search for posts..."
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        >
        <h1>Information</h1>
        <div class="results" id="results">
          <div id="info-block"></div>
          <div id="extra-info-block"></div>
        </div>
      </div>
      <div class="vertical-views">
        <div class="paginator" id="paginator-top"></div>
        <div class="content" id="content"></div>
        <noscript>
          <h1 class="subtitle">Javascript is disabled.</h1>
        </noscript>
        <div class="paginator" id="paginator-bottom"></div>
      </div>  
    </div>
  </div>
  <script src="https://unpkg.com/unfetch@4.1.0/polyfill/index.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>
  <script src="/js/utils.js"></script>
  <script src="/js/user.js"></script>
`, { service: data.service });

const post = data => shell(`
  <div class="main">
    ${header({ currentPage: 'posts' })}
    ${subheader({ currentPage: 'posts' })}
    <div class="views">
      <div class="sidebar" style="margin-right: 20px;">
        <span class="subtitle">Click on the thumbnails to reveal the original resolution image.</span>
        <h1>Information</h1>
        <div class="results" id="results"></div>
      </div>
      <div class="page" id="page">
        <noscript>
          <h1 class="subtitle">Javascript is disabled.</h1>
        </noscript>
      </div>
    </div>
  </div>
  <script src="https://unpkg.com/unfetch@4.1.0/polyfill/index.js"></script>
  <script src="/js/expander.js"></script>
  <script src="/js/post.js"></script>
`, { service: data.service });

const server = () => shell(`
  <div class="discord-main">
    <div class="channels" id="channels"></div>
    <div class="messages" id="messages">
      <noscript>
        <div class="message">
          <p>You need JavaScript to view archived Discord messages.</p>
        </div>
      </noscript>
    </div>
  </div>
  <script src="https://unpkg.com/unfetch@4.1.0/polyfill/index.js"></script>
  <script src="/js/discord.js"></script>
`, { service: 'discord', compatibility: true, discord: true });

module.exports = { artists, post, user, server };
