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
        <script src="/js/ppolyfill.js"></script>
        <script src="/js/unfetch.js"></script>
        <script src="/js/require.js"></script>
        <script src="/js/utils.js"></script>
        <script src="/js/user.js"></script>
        <h1>Options</h1>
        <div class="results">
          <li><a href="/requests/new?user=${props.id}&service=${props.service}">Request update</a></li>
          <li><a href="/posts/upload?user=${props.id}&service=${props.service}">Upload file</a></li>
          <li><a href="${props.url.replace(/\/$/, '')}/rss">RSS</a></li>
        </div>
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
