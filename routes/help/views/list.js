const { shell, header, subheader } = require('../../../views/components');
const { sidebar } = require('./components');

const list = () => shell(`
  <div class="main">
    ${header({ currentPage: 'help' })}
    ${subheader({ currentPage: 'help' })}
    <div class="views">
      ${sidebar()}
      <div class="page" id="page"></div>
    </div>
  </div>
`);

module.exports = { list };
