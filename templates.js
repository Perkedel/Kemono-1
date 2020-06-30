const shell = (html, props) => `
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

const header = () => `
  <ul class="header">
    <li><a href="/">Kemono</a></li>
    <li class="current-page"><a href="/">Posts</a></li>
    <li><a href="/help">Help</a></li>
    <li><a href="https://liberapay.com/kemono.party" target="_blank">Donate</a></li>
  </ul>
`;

const subheader = () => `
  <ul class="subheader">
    <li><a href="/">List</a></li>
    <li><a href="/importer">Import</a></li>
    <li><a href="/random">Random</a></li>
    <li><a href="/help/posts">Help</a></li>
  </ul>
`;

const user = data => shell(`
  <div class="main" id="main">
    ${header()}
    ${subheader()}
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
    <div class="paginator" id="paginator"></div>
    <div class="content" id="content"></div>
    <noscript>
      <h1 class="subtitle">Javascript is disabled.</h1>
    </noscript>
  </div>
  <script src="https://unpkg.com/unfetch@4.1.0/polyfill/index.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>
  <script src="/js/utils.js"></script>
  <script src="/js/user.js"></script>
`, { service: data.service });

const post = data => shell(`
  <div class="main">
    ${header()}
    ${subheader()}
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

module.exports = { post, user, server };
