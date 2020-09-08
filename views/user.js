const { shell, header, subheader, list } = require('./components');

const user = props => shell(`
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
        <script src="https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js"></script>
        <script src="https://unpkg.com/unfetch@4.1.0/polyfill/index.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>
        <script src="/js/utils.js"></script>
        <script src="/js/user.js"></script>
        <h1>Options</h1>
        <a href="/requests/new?user=${props.id}&service=${props.service}">Request update</a>
        <a href="/posts/upload?user=${props.id}&service=${props.service}">Upload file</a>
        <a href="${props.url.replace(/\/$/, '')}/rss">RSS</a>
      </div>
      ${list({
        o: props.query.o,
        url: props.url,
        posts: props.posts,
        count: props.count
      })}
    </div>
  </div>
`, { service: props.service, count: props.count });

module.exports = { user };
