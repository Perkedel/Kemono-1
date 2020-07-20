const { shell, header, subheader } = require('../../../views/components');

const list = props => shell(`
  <div class="main">
    ${header({ currentPage: 'board' })}
    ${subheader({ currentPage: 'board' })}
    <div class="page" id="page">
      <p>
        <span class="subtitle">Index is limited to 25 posts.</span>
      </p>
      <table class="search-results" width="100%">
        <thead>
          <tr>
            <th>No.</th>
            <th>Subject</th>
            <th>Poster</th>
          </tr>
        </thead>
        <tbody>
          ${props.threads.length === 0 ? `
            <tr>
              <td></td>
              <td class="subtitle">No threads yet.</td>
              <td></td>
            </tr>
          ` : ''}
          ${props.threads.map(thread => `
            <tr class="artist-row">
              <td><a href="/board/thread/${thread.no}">#${thread.no}</a></td>
              <td><a href="/board/thread/${thread.no}">${thread.subject}</a></td>
              <td>${thread.name}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
`)

module.exports = { list };