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
        <script src="https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js"></script>
        <script src="https://unpkg.com/unfetch@4.1.0/polyfill/index.js"></script>
        <script src="/js/post.js"></script>
        <script type="text/javascript" data-cfasync="false" async src="https://poweredby.jads.co/js/jads.js"></script>
        <ins id="871690" data-width="158" data-height="180"></ins>
        <script type="text/javascript" data-cfasync="false" async>(adsbyjuicy = window.adsbyjuicy || []).push({'adzone':871690});</script>
      </div>
      <div class="page" id="page">
        ${props.posts.map(post => {
          let previews = '';
          let attachments = '';
          if (Object.keys(post.file).length !== 0) {
            (/\.(gif|jpe?g|png|webp)$/i).test(post.file.path) ? previews += `
              <a class="fileThumb" href="${post.file.path}">
                <img
                  data-src="/thumbnail${post.file.path.replace('https://kemono.party', '')}?size=800"
                  src="/thumbnail${post.file.path.replace('https://kemono.party', '')}?size=800"
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
                  data-src="/thumbnail${attachment.path.replace('https://kemono.party', '')}?size=800"
                  src="/thumbnail${attachment.path.replace('https://kemono.party', '')}?size=800"
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
