const { shell, header, subheader } = require('../../../views/components');
const { sidebar } = require('./components');

const yiff = () => shell(`
  <div class="main">
    ${header({ currentPage: 'import' })}
    ${subheader({ currentPage: 'import' })}
    <div class="views">
      ${sidebar()}
      <div class="page" id="page">
        <h1>Import from yiff.party</h1>
        <form
          class="importer-form"
          action="/api/import"
          enctype="application/x-www-form-urlencoded"
          method="post"
        >
          <select id="service" name="service">
            <option value="yiffparty" selected>yiff.party</option>
          </select>
          <input 
            type="hidden"
            name="session_key"
            value="nothing"
          >
          <input 
            type="text"
            id="users"
            name="users"
            placeholder="user ids (comma separated, no spaces)"
            autocomplete="off" 
            autocorrect="off" 
            autocapitalize="off" 
            spellcheck="false"
            required
          >
          <input type="submit"/>
        </form>
        <p>
          If you don't have access to the users you want to import or the users can no longer be subscribed to, you may be able to import them for free if they are on <a href="https://yiff.party">yiff.party</a>. Simply put either a single ID (2390849 in <a href="https://yiff.party/patreon/2390849">https://yiff.party/patreon/2390849</a>) or comma-separated list of IDs in the field above, and Kemono will import it like any other site. Only Patreon is supported. Shared files will not be downloaded.
          <h2>Important information</h2>
          <ul>
            <li>Due to API limitations on yiff.party's end, the imported posts will not have edit tracking. Please import artists that use anti-piracy editing techniques with the <a href="./">native importer</a>.</li>
            <li>If yiff.party is down, malfunctioning or otherwise unavailable, the importer will not work (obviously?)</li>
          </ul>
        </p>
      </div>
    </div>
  </div>
`);

module.exports = { yiff };
