const { shell, header, subheader } = require('./components');
const { transliterate } = require('transliteration');

const updated = data => shell(`
  <div class="main" id="main">
    ${header({ currentPage: 'artists' })}
    ${subheader({ currentPage: 'artists' })}
    <div class="page" id="page">
      <table class="search-results" width="100%">
        <thead>
          <tr>
            <th width="50px">Icon</th>
            <th>Name</th>
            <th>Transliteration</th>
            <th>Service</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          ${data.results.length === 0 ? `
            <tr>
              <td></td>
              <td class="subtitle">No artists found for your query.</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ` : ''}
          ${data.results.map(artist => artist ? `
            <tr class="artist-row">
              <td>
                <div class="user-icon" data-user="${artist.user}" data-service="${artist.service}"></div>
              </td>
              <td>
                <a href="/${artist.service}/${artist.service === 'discord' ? 'server' : 'user'}/${artist.user}">${artist.name}</a>
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
                  discord: 'Discord',
                  dlsite: 'DLsite'
                })[artist.service]}
              </td>
              <td>
                ${artist.max}
              </td>
            </tr>
          ` : '').join('')}
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

module.exports = { updated };
