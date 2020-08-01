const { shell, header, subheader } = require('../../../views/components');
const { sidebar } = require('./components');

const about = () => shell(`
  <div class="main">
    ${header({ currentPage: 'help' })}
    ${subheader({ currentPage: 'help' })}
    <div class="views">
      ${sidebar()}
      <div class="page" id="page">
        <h1>About</h1>
        <p>
          <span class="subtitle">ｷﾀ━━━(ﾟ∀ﾟ)━━━!!</span>
        </p>
      </div>
    </div>
  </div>
`);

module.exports = { about };
