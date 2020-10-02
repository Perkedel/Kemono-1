const dfmt = require('dateformat');
dfmt.masks['sqltime'] = 'yyyy-mm-dd_HH:MM:ss';
const { shell, header, subheader } = require('./components');

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
const post = props => shell(`
  <div class="main">
    ${header({ currentPage: 'posts' })}
    ${subheader({ currentPage: 'posts' })}
    ${props.posts.length ? `
      <div class="views">
        <div class="sidebar" style="margin-right: 20px;">
          <span class="subtitle">Click on the thumbnails to reveal the original resolution image.</span>
          <div>
            <h5>Search</h5>
            <form action="/posts" accept-charset="UTF-8" method="get">
              <input
                type="text"
                name="tags"
                autocomplete="off"
              >
              <input type="submit" name="commit" value="Search">
            </form>
          </div>
          ${Object.keys(props.tags).map(namespace => {
            return `
              <div>
                <h6>${capitalize(namespace)}</h6>
                ${props.tags[namespace].map(tag => `<li ${namespace !== 'general' ? `class="tag-${namespace}` : ''}"><a href="/posts?tags=${namespace !== 'general' ? `${namespace}%3A` : ''}${tag.replace(/ +/g, '_')}&commit=Search">${tag}</a></li>`).join('')}
              </div>
            `
          }).join('')}
          <div>
            <h5>Information</h5>
            <li>ID: <a href="/posts?tags=id%3A${props.posts[0].id}&commit=Search" title="The paysite-assigned ID given to this post.">${props.posts[0].id}</a></li>
            <li>User ID: <a href="/posts?tags=user%3A${props.posts[0].user}&commit=Search" title="The paysite-assigned ID given to the artist of this post.">${props.posts[0].user}</a></li>
            <li>Service:
              <a href="/posts?tags=service%3A${props.posts[0].service}&commit=Search" title="The paysite this post was imported from.">
                ${({
                  patreon: 'Patreon',
                  fanbox: 'Pixiv Fanbox',
                  gumroad: 'Gumroad',
                  subscribestar: 'SubscribeStar',
                  dlsite: 'DLsite'
                })[props.posts[0].service]}
              </a>
            </li>
            <li>Added: <a href="/posts?tags=added%3A${dfmt(new Date(props.posts[0].added).toISOString(), 'sqltime')}*&commit=Search" title="The date this post was imported.">${props.posts[0].added}</a></li>
            ${props.posts[0].published ? `<li>Published: <a href="/posts?tags=published%3A${dfmt(new Date(props.posts[0].published).toISOString(), 'sqltime')}&commit=Search" title="The date this post was published to the paysite.">${props.posts[0].published}</a></li>` : ''}
            <li>Rating: ${({
              safe: `<a href="/posts?tags=rating%3Asafe&commit=Search" title="This post is safe for public viewing.">Safe</a>`,
              questionable: `<a href="/posts?tags=rating%3Aquestionable&commit=Search" title="This post contains risky/ecchi elements.">Questionable</a>`,
              explicit: `<a href="/posts?tags=rating%3Aexplicit&commit=Search" title="(¬‿¬ )">Explicit</a>`
            })[props.posts[0].rating]}</li>
            <li>${({
              patreon: `<a href="https://www.patreon.com/posts/${props.posts[0].id}">Source</a>`,
              fanbox: `<a href="https://www.pixiv.net/fanbox/creator/${props.posts[0].user}/post/${props.posts[0].id}">Source</a>`,
              gumroad: `<a href="https://gumroad/l/${props.posts[0].id}">Source</a>`,
              subscribestar: `<a href="https://www.subscribestar.com/posts/${props.posts[0].id}">Source</a>`,
              dlsite: `<a href="https://www.dlsite.com/ecchi-eng/work/=/product_id/${props.posts[0].id}">Source</a>`
            })[props.posts[0].service]}</li>
          </div>
          <div>
            <h5>Options</h5>
            <li><a href="#edit">Edit</a></li>
            <li>
              ${props.flag.length ? '<span class="subtitle">Already flagged.</span>': `
                <form method="post" action="/api/flag" onsubmit="return (typeof submitted == 'undefined') ? (submitted = true) : !submitted">
                  <input type="hidden" name="id" value="${props.posts[0].id}">
                  <input type="hidden" name="service" value="${props.posts[0].service}">  
                  <label class="a" style="cursor:pointer" for="submit">Flag for reimport</label>
                  <button type="submit" id="submit" style="display:none"></button>
                </form>
              `}
            </li>
          </div>
          <div>
            <h5>History</h5>
            <li><a href="/posts/${props.posts[0].service}/${props.posts[0].id}/history">Tags</a></li>
          </div>
        </div>
        <div class="page" id="page">
          ${props.posts.map(post => {
            let previews = '';
            let attachments = '';
            if (Object.keys(post.file).length !== 0) {
              (/\.(gif|jpe?g|png|webp)$/i).test(post.file.path) ? previews += `
                <a class="fileThumb" href="${post.file.path}">
                  <img
                    data-src="/thumbnail${post.file.path.replace('https://kemono.party', '')}"
                    src="/thumbnail${post.file.path.replace('https://kemono.party', '')}"
                  >
                </a>
                <br>
              ` : attachments += `
                <a href="${post.file.path}" target="_blank">
                  Download ${post.file.name}
                </a>
                <br>
              `;
            }

            if (post.embed && Object.keys(post.embed).length !== 0) {
              previews += `
                <a href="${post.embed.url}" target="_blank">
                  <div class="embed-view">
                    ${post.embed.subject ? `<h3>${post.embed.subject}</h3>` : '<h3 class="subtitle">(No title)</h3>'}
                    ${post.embed.description ? `<p>${post.embed.description}</p>` : ''}
                  </div>
                </a>
                <br>
              `;
            }

            post.attachments.forEach(attachment => {
              (/\.(gif|jpe?g|png|webp)$/i).test(attachment.path) ? previews += `
                <a class="fileThumb" href="${attachment.path}">
                  <img
                    data-src="/thumbnail${attachment.path.replace('https://kemono.party', '')}"
                    src="/thumbnail${attachment.path.replace('https://kemono.party', '')}"
                  >
                </a>
                <br>
              ` : attachments += `
                <a href="${attachment.path}" target="_blank">
                  Download ${attachment.name}
                </a>
                <br>
              `;
            });

            // title hidden with subscribestar posts to prevent redundancy
            return `
              ${post.shared_file ? `
                <p class="subtitle">This post is user-shared, and cannot be verified for integrity. Exercise caution.</p>
              ` : ''}
              ${post.service === 'dlsite' && post.attachments.length > 1 ? `
                <p class="subtitle">
                  This DLsite post was received as a split set of multiple files due to file size. Download all the files, then open the .exe file to compile them into a single one.
                </p>
              ` : ''}
              <h1>${post.service === 'subscribestar' ? '' : post.title}</h1>
              ${attachments}
              <p>${post.content}</p>
              ${previews}
              ${props.posts.length > 1 ? '<hr>' : ''}
            `;
          }).join('')}
          <div class="search-form" id="edit">
            <form
              method="post"
              action="/api/edit_rating"
              onsubmit="return (typeof submitted == 'undefined') ? (submitted = true) : !submitted"
            >
              <strong>Rating</strong><br>
              <input type="hidden" name="id" value="${props.posts[0].id}">
              <input type="hidden" name="user" value="${props.posts[0].user}">
              <input type="hidden" name="service" value="${props.posts[0].service}">
              <input type="radio" name="rating" value="safe" ${props.posts[0].rating === 'safe' ? 'checked' : ''}>Safe
              <input type="radio" name="rating" value="questionable" ${props.posts[0].rating === 'questionable' ? 'checked' : ''}>Questionable
              <input type="radio" name="rating" value="explicit" ${props.posts[0].rating === 'explicit' ? 'checked' : ''}>Explicit
              <input type="submit" value="Edit Rating">
            </form>
            <form
              method="post"
              action="/api/edit_tags"
              onsubmit="return (typeof submitted == 'undefined') ? (submitted = true) : !submitted"
            >
              <input type="hidden" name="id" value="${props.posts[0].id}">
              <input type="hidden" name="user" value="${props.posts[0].user}">
              <input type="hidden" name="service" value="${props.posts[0].service}">
              <strong>Tags</strong><br>
              <textarea
                cols="50"
                name="tags"
                rows="8"
                autocomplete="off"
                placeholder="Tags *and* categories will be displayed in the order you type them."
              >${props.posts[0].tags}</textarea>
              <br>
              <input type="submit" value="Edit Tags">
            </form>
          </div>
        </div>
      </div>
    </div>
    <script src="/js/expander.js"></script>
  ` : `
    <h1 class="subtitle">Not found.</h1>
    <p class="subtitle">There's nothing here.</p>
  `}
`, {
  service: props.service,
  posts: props.posts
});

module.exports = { post };
