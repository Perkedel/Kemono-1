const { shell, header, subheader } = require('./components');

const history = props => shell(`
  <div class="main">
    ${header({ currentPage: 'posts' })}
    ${subheader({ currentPage: 'posts' })}
    <div class="page" id="page">
      <table class="search-results" width="100%">
        <thead>
          <tr>
            <th>Date</th>
            <th>Rating</th>
            <th>Tags</th>
            <th>Options</th>
          </tr>
        </thead>
        <tbody>
          ${props.revisions.length === 0 ? `
            <tr>
              <td class="subtitle">No revisions yet.</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ` : props.revisions.map(revision => `
            <tr class="artist-row">
              <td>${revision.date}</td>
              <td>${revision.rating}</td>
              <td>${revision.tags}</td>
              <td>
                <form method="post" action="/api/revert" onsubmit="return (typeof submitted == 'undefined') ? (submitted = true) : !submitted">
                  <input type="hidden" name="_id" value="${revision._id}">
                  <label class="a" style="cursor:pointer" for="submit-${revision._id}">Revert to</label>
                  <button type="submit" id="submit-${revision._id}" style="display:none"></button>
                </form>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
`);

module.exports = { history };
