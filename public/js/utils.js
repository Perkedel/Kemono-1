/* eslint-disable no-unused-vars */

function getParameterByName (name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[[]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  var results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function debounce (func, wait, immediate) {
  var timeout;
  return function () {
    var context = this; var args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

const thumbHTML = data => `
  <a href="${data.href}" class="thumb-link">
    ${data.src ? `
      <div class="thumb thumb-with-image ${data.class || 'thumb-standard'}">
        <img src="/thumbnail${data.src.replace('https://kemono.party', '')}?size=500">
      </div>
    ` : `
      <div class="thumb thumb-with-text ${data.class || 'thumb-standard'}">
        <h3>${data.title}</h3>
        <p>${data.content}</p>
      </div>
    `}
  </a>
`;

async function renderPosts (posts) {
  const contentView = document.getElementById('content');
  posts.forEach(post => {
    let parent = false;
    const inline = post.content.match(/\bhttps?:\/\/\S+/gi) || [];
    const href = post.service === 'patreon' ? `/user/${post.user}/post/${post.id}` : `/${post.service}/user/${post.user}/post/${post.id}`;
    inline.map(url => {
      if ((/\.(gif|jpe?g|png|webp)$/i).test(url)) {
        parent = true;
        contentView.innerHTML += thumbHTML({
          src: url,
          href: href,
          class: 'thumb-child'
        });
      }
    });
    post.attachments.map(attachment => {
      if ((/\.(gif|jpe?g|png|webp)$/i).test(attachment.path)) {
        parent = true;
        contentView.innerHTML += thumbHTML({
          src: attachment.path,
          href: href,
          class: 'thumb-child'
        });
      }
    });
    contentView.innerHTML += thumbHTML({
      src: post.post_type === 'image_file' || post.post_type === 'image' ? post.post_file.path : undefined,
      title: post.title,
      content: post.content.replace(/(&nbsp;|<([^>]+)>)/ig, ''),
      class: parent ? 'thumb-parent' : undefined,
      href: href
    });
  });
}

/* eslint-enable no-unused-vars */
