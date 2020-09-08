const { shell, header, subheader } = require('./components');

const success = props => shell(`
  <div class="main">
    ${header({ currentPage: props.currentPage })}
    ${subheader({ currentPage: props.currentPage })}
    <h1 class="subtitle">Success!</h1>
    ${props.redirect ? `<meta http-equiv="Refresh" content="2; url='${props.redirect}'" />` : ''}
  </div>
`);

module.exports = { success };
