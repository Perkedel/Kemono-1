const { shell, header, subheader } = require('./components');

const favorites = () => shell(`
  <div class="main" id="main">
    ${header({ currentPage: 'artists' })}
    ${subheader({ currentPage: 'artists' })}
    <div class="page" id="page">
      <table class="search-results" width="100%">
        <thead>
          <tr>
            <th>Name</th>
            <th>Service</th>
          </tr>
        </thead>
        <tbody id="favorites-list">
          <noscript>
            <tr>
              <td class="subtitle">This feature requires Javascript.</td>
              <td></td>
            </tr>
          </noscript>
        </tbody>
      </table>
    </div>
  </div>
  <script src="https://unpkg.com/unfetch@4.1.0/polyfill/index.js"></script>
  <script src="/js/favorites.js"></script>
`);

module.exports = { favorites };
