const { shell, header, subheader } = require('../../../views/components');
const { sidebar } = require('./components');

const bans = () => shell(`
  <div class="main">
    ${header({ currentPage: 'help' })}
    ${subheader({ currentPage: 'help' })}
    <div class="views">
      ${sidebar()}
      <div class="page" id="page">
        <h1>Bans</h1>
        <p>
          The following users have been banned from this instance. Posts from them will not import.<br>
          <ul id="bans">
            
          </ul>
        </p>
      </div>
    </div>
  </div>
  <script src="/js/bans.js"></script>
`);

module.exports = { bans };
