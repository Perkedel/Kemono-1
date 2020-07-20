const { shell, header, subheader } = require('../../../views/components');
const { form } = require('./components');

const thread = (html, props) => shell(`
  <div class="main">
    ${header({ currentPage: 'board' })}
    ${subheader({ currentPage: 'board' })}
    <div class="page" id="page">
      <div class="bbs-thread">
        ${html}
      </div>
      ${form({ action: `./${props.id}/reply` })}
    </div>
  </div>
`);

module.exports = { thread };
