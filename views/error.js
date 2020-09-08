const { shell, header, subheader } = require('./components');

const error = props => shell(`
  <div class="main">
    ${header({ currentPage: props.currentPage })}
    ${subheader({ currentPage: props.currentPage })}
    <h1 class="subtitle">Error</h1>
    <p class="subtitle">${props.message}</p>
    ${props.redirect ? `<meta http-equiv="Refresh" content="2; url='${props.redirect}'" />` : ''}
  </div>
`);

module.exports = { error };
