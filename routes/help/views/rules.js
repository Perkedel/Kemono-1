const { shell, header, subheader } = require('../../../views/components');
const { sidebar } = require('./components');

const rules = () => shell(`
  <div class="main">
    ${header({ currentPage: 'help' })}
    ${subheader({ currentPage: 'help' })}
    <div class="views">
      ${sidebar()}
      <div class="page" id="page">
        <h1>Rules</h1>
        <p>
          <ul>
            <li>All forms of real porn (including NSFW ASMR and erotic cosplay) are not allowed here, and will be banned and purged on sight.</li>
            <li>Do not attempt to import real child porn or animal abuse materials.</li>
          </ul>
        </p>
      </div>
    </div>
  </div>
`);

module.exports = { rules };
