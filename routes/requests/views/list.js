const { shell, header, subheader } = require('../../../views/components');

const list = props => shell(`
  <div class="main">
    ${header({ currentPage: 'requests' })}
    ${subheader({ currentPage: 'requests' })}
    <div class="page" id="page">
      <form
        autocomplete="on"
        class="search-form"
        novalidate="novalidate"
        action="/requests"
        method="get"
        onsubmit="return (typeof submitted == 'undefined') ? (submitted = true) : !submitted"
      >
        <div>
          <label for="q">Name</label>
          <input
            type="text"
            name="q"
            id="q"
            autocomplete="off"
            value="${props.query.q || ''}"
          >
          <small class="subtitle" style="margin-left: 5px;">Leave blank to list all.</small>
        </div>
        <div>
          <label for="service">Service</label>
          <select id="service" name="service">
            <option value="">All</option>
            <option value="patreon" ${props.query.service === 'patreon' ? 'selected' : ''}>Patreon</option>
            <option value="fanbox" ${props.query.service === 'fanbox' ? 'selected' : ''}>Pixiv Fanbox</option>
            <option value="gumroad" ${props.query.service === 'gumroad' ? 'selected' : ''}>Gumroad</option>
            <option value="subscribestar" ${props.query.service === 'subscribestar' ? 'selected' : ''}>SubscribeStar</option>
            <option value="discord" ${props.query.service === 'discord' ? 'selected' : ''}>Discord</option>
            <option value="dlsite" ${props.query.service === 'dlsite' ? 'selected' : ''}>DLsite</option>
          </select>
        </div>
        <div>
          <label for="sort_by">Sort by</label>
          <select id="sort_by" name="sort_by">
            <option value="votes">Votes</option>
            <option value="created" ${props.query.sort_by === 'created' ? 'selected' : ''}>Date posted</option>
            <option value="price" ${props.query.sort_by === 'price' ? 'selected' : ''}>Price</option>
          </select>
          <select name="order">
            <option value="asc">Ascending</option>
            <option value="desc" ${props.query.order === 'desc' ? 'selected' : ''}>Descending</option>
          </select>
        </div>
        <div>
          <label for="status">Status</label>
          <input type="radio" name="status" value="open" style="margin-right:5px" ${props.query.status !== 'fulfilled' ? 'checked' : ''}>Open
          <input type="radio" name="status" value="fulfilled" style="margin-right:5px" ${props.query.status === 'fulfilled' ? 'checked' : ''}>Fulfilled
          <input type="radio" name="status" value="closed" style="margin-right:5px" ${props.query.status === 'closed' ? 'checked' : ''}>Closed
        </div>
        <div>
          <label for="max_price">Max Price</label>
          $ <input id="max-price" name="max-price" type="number" min="0.00" max="10000.00" step="0.01" required/>
        </div>
        <div>
          <label for="limit">Limit</label>
          <input
            type="text"
            name="limit"
            id="limit"
            autocomplete="off"
            value="${props.query.limit || ''}"
          >
          <small class="subtitle" style="margin-left: 5px;">Up to 250, default 50.</small>
        </div>
        <input type="submit" name="commit" value="Search" data-disable-with="Search">
      </form>
      <table class="search-results" width="100%">
        <thead>
          <tr>
            <th width="100px"></th>
            <th></th>
            <th>Status</th>
            <th>Price</th>
            <th>Votes</th>
            <th>Notifications</th>
          </tr>
        </thead>
        <tbody>
          ${props.requests.length === 0 ? `
            <tr>
              <td></td>
              <td class="subtitle">No requests yet.</td>
            </tr>
          ` : ''}
          ${props.requests.map(request => `
            <tr class="artist-row">
              <td>
                <a href="${request.image}" target="_blank">
                  ${request.image ? `<img src="/thumbnail${request.image}?size=200">` : `<span class="subtitle">No image</span>`}
                </a>
              </td>
              <td>
                <a href="${({
                  patreon: request.post_id ? `https://www.patreon.com/posts/${request.post_id}` : `https://www.patreon.com/user?u=${request.user}`,
                  fanbox: request.post_id ? `https://www.pixiv.net/fanbox/creator/${request.user}/post/${request.post_id}` : `https://www.pixiv.net/fanbox/creator/${request.user}`,
                  gumroad: request.post_id ? `https://gumroad.com/l/${request.post_id}` : `https://gumroad.com/${request.user}`,
                  subscribestar: request.post_id ? `https://subscribestar.adult/posts/${request.post_id}` : `https://subscribestar.adult/${request.user}`,
                  dlsite: request.post_id ? `https://www.dlsite.com/ecchi-eng/work/=/product_id/${request.post_id}` : `https://www.dlsite.com/eng/circle/profile/=/maker_id/${request.user}`
                })[request.service]}"
                  target="_blank"
                >
                  <strong>${request.title}</strong><span class="subtitle"> (${({
                    patreon: 'Patreon',
                    fanbox: 'Pixiv Fanbox',
                    subscribestar: 'SubscribeStar',
                    gumroad: 'Gumroad',
                    discord: 'Discord',
                    dlsite: 'DLsite'
                  })[request.service]})</span>
                  <br>
                  ${request.description ? `<small>${request.description}</small><br>` : ''}
                  <small class="subtitle">${request.created}</small>
                </a>
              </td>
              <td>
                ${({
                  open: '<span style="color:#cc0">Open</span>',
                  fulfilled: '<span style="color:#0f0">Fulfilled</span>',
                  closed: '<span style="color:#ff6961">Closed</span>'
                })[request.status]}
              </td>
              <td>
                ${request.price <= 5 ? `<span style="color:#0f0">$${parseFloat(request.price).toFixed(2)}</span>` : (
                    request.price <= 20 ? `<span style="color:#cc0">$${parseFloat(request.price).toFixed(2)}</span>` : (
                      request.price <= 50 ? `<span style="color:#ff6961">$${parseFloat(request.price).toFixed(2)}</span>` : 
                        `<span style="color:#ff6961">$${parseFloat(request.price).toFixed(2)}</span>`
                    )
                  )
                }
                </td>
              <td>
                <form
                  action="/requests/${request.id}/vote_up"
                  method="post"
                  onsubmit="return (typeof submitted == 'undefined') ? (submitted = true) : !submitted"
                >
                  <span>${request.votes} ${request.votes === 1 ? 'vote' : 'votes'}</span>
                  <label class="a" style="cursor:pointer" for="voteup-${request.id}">(+)</label>
                  <button type="submit" id="voteup-${request.id}" style="display:none"></button>
                </form>
              </td>
              <td>
                ${request.status === 'open' ? `
                  <a href="javascript:subscribeToRequestStatus('${request.id}');">Subscribe</a><br>
                  <small class="subtitle">May not work on older browsers or privacy-centric forks.</small>
                ` : `
                  <span class="subtitle">Request completed.</span>
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <script src="/js/swreg.js"></script>
`);

module.exports = { list };
