const { shell, header, subheader } = require('../../../views/components');
const { sidebar } = require('./components');

const ok = () => shell(`
  <div class="main">
    ${header({ currentPage: 'import' })}
    ${subheader({ currentPage: 'import' })}
    <div class="views">
      ${sidebar()}
      <div class="page" id="page">
        <h1>Success</h1>
        <p>
          Your session key has been submitted to the server. Posts will be added soon. Thank you for contributing!<br>
          If you're having trouble with the importer, contact admin. 
        </p>
      </div>
    </div>
  </div>
`);

module.exports = { ok };
