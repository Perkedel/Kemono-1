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
      </div>
      <div class="page" id="page">
        ${props.posts.map(post => {
          let previews = '';
          let attachments = '';
          if (Object.keys(post.post_file).length !== 0) {
            post.post_type === 'image_file' || post.post_type === 'image' ? previews += `
              <a class="fileThumb" href="${post.post_file.path}">
                <img
                  data-src="/thumbnail${post.post_file.path.replace('https://kemono.party', '')}"
                  src="/thumbnail${post.post_file.path.replace('https://kemono.party', '')}"
                >
              </a>
              <br>
            ` : attachments += `
              <a href="${post.post_file.path}" target="_blank">
                Download ${post.post_file.name}
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
            <h1>${post.service === 'subscribestar' ? '' : post.title}</h1>
            <p>${post.content}</p>
            ${attachments}
            ${previews}
            ${props.posts.length > 1 ? '<hr>' : ''}
          `;
        }).join('')}
      </div>
    </div>
  </div>
  <script src="https://unpkg.com/unfetch@4.1.0/polyfill/index.js"></script>
  <script src="/js/expander.js"></script>
  <script src="/js/post.js"></script>
`, { service: props.service });

module.exports = { post };
