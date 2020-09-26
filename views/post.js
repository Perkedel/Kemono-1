const { shell, header, subheader } = require('./components');

const post = props => shell(`
  <div class="main">
    ${header({ currentPage: 'posts' })}
    ${subheader({ currentPage: 'posts' })}
    <div class="views">
      <div class="sidebar" style="margin-right: 20px;">
        <span class="subtitle">Click on the thumbnails to reveal the original resolution image.</span>
        <h1>Information</h1>
        <div class="results" id="results"></div>
        <script src="/js/ppolyfill.js"></script>
        <script src="/js/unfetch.js"></script>
        <script src="/js/post.js"></script>
      </div>
      <div class="page" id="page">
        ${props.posts.map(post => {
          let previews = '';
          let attachments = '';
          if (Object.keys(post.file).length !== 0) {
            (/\.(gif|jpe?g|png|webp)$/i).test(post.file.path) ? previews += `
              <a class="fileThumb" href="${post.file.path}">
                <img
                  data-src="https://images.weserv.nl/?url=https://kemono.party${post.file.path.replace('https://kemono.party', '')}&width=800&output=jpg&we"
                  src="https://images.weserv.nl/?url=https://kemono.party${post.file.path.replace('https://kemono.party', '')}&width=800&output=jpg&we"
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
                  data-src="https://images.weserv.nl/?url=https://kemono.party${attachment.path.replace('https://kemono.party', '')}&width=800&output=jpg&we"
                  src="https://images.weserv.nl/?url=https://kemono.party${attachment.path.replace('https://kemono.party', '')}&width=800&output=jpg&we"
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
      </div>
    </div>
  </div>
  <script src="/js/expander.js"></script>
`, {
  service: props.service,
  posts: props.posts
});

module.exports = { post };
