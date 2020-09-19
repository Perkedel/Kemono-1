const { shell } = require('../../../views/components');

const status = props => shell(`
  <div class="main">
    <div class="info">
      <p>
        <strong>Importer logs</strong><br>
        For bug reporting purposes, your importer ID is <strong>${props.id}</strong>.
        <div class="logs" id="logs">
          ${props.log.map(x => x.log).join('<br>')}
        </div>
      </p>
    </div>
  </div>
  <script src="/js/status.js"></script>
`, {
  importId: props.id
});

module.exports = { status };
