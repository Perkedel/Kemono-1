const { shell, header, subheader, list } = require('./components')

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
      </div>
      ${list({
        o: props.query.o,
        url: props.url,
        posts: props.posts
      })}
    </div>
  </div>
  <script src="https://unpkg.com/unfetch@4.1.0/polyfill/index.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>
  <script src="/js/utils.js"></script>
  <script src="/js/user.js"></script>
`, { service: props.service });

module.exports = { user };