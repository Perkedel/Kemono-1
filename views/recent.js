const { shell, header, subheader, list } = require('./components');

const recent = props => shell(`
  <div class="main">
    ${header({ currentPage: 'posts' })}
    ${subheader({ currentPage: 'posts' })}
    <div class="views">
      <div class="sidebar">
        <select id="service-input">
          <option value="" selected></option>
          <option value="patreon">Patreon</option>
          <option value="fanbox">Pixiv Fanbox</option>
          <option value="gumroad">Gumroad</option>
          <option value="discord">Discord</option>
          <option value="subscribestar">SubscribeStar</option>
          <option value="dlsite">DLsite</option>
        </select>
        <input
          id="search-input"
          type="text"
          placeholder="search for a user..."
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        >
        <div class="results" id="results">

        </div>
      </div>
      ${list({
        o: props.query.o,
        url: props.url,
        posts: props.posts
      })}
    </div>
  </div>
  <script src="/js/require.js"></script>
  <script src="/js/utils.js"></script>
  <script src="/js/posts.js"></script>
`);

module.exports = { recent };
