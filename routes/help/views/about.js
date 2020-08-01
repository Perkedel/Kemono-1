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
          Kemono is a website for the sharing of paywalled content.<br>
          Key features include:<br>
          <ul>
            <li>Web interface significantly more performant than <a href="https://yiff.party">yiff.party</a>'s</li>
            <li>Familiar booru-like UI</li>
            <li>Pixiv Fanbox, Gumroad, Discord, SubscribeStar, and DLsite support</li>
            <li>Support for post edits</li>
            <li>Free and open-source codebase</li>
          </ul>
        </p>
      </div>
    </div>
  </div>
`);

module.exports = { about };
