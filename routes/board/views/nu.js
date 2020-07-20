const { shell, header, subheader } = require('../../../views/components');
const { form } = require('./components');

const nu = () => shell(`
  <div class="main">
    ${header({ currentPage: 'board' })}
    ${subheader({ currentPage: 'board' })}
    <div class="page" id="page">
      <h1>New thread</h1>
      ${form({
        action: '/board/new',
        op: true
      })}
    </div>
  </div>
`);

module.exports = { nu };
