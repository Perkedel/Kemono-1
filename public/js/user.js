function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
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
        <img src="/thumbnail${data.src.replace('https://kemono.party/', '')}?size=500">
      </div>
    ` : `
      <div class="thumb thumb-with-text ${data.class || 'thumb-standard'}">
        <h3>${data.title}</h3>
        <p>${data.content}</p>
      </div>
    `}
  </a>
`;

async function loadUserInfo () {
  let service, api, proxy, href;
  const resultsView = document.getElementById('results');
  const pathname = window.location.pathname.split('/');
  switch (document.getElementsByName('service')[0].content) {
    case 'patreon':
      service = 'Patreon';
      api = `/api/lookup/cache/${pathname[2]}?service=patreon`
      proxy = `/proxy/user/${pathname[2]}`
      href = `https://www.patreon.com/user?u=${pathname[2]}`
      break;
    case 'fanbox':
      service = 'Fanbox';
      api = `/api/lookup/cache/${pathname[3]}?service=fanbox`
      href = `https://www.pixiv.net/fanbox/creator/${pathname[3]}`
      break;
    case 'gumroad':
      service = 'Gumroad';
      api = `/api/lookup/cache/${pathname[3]}?service=gumroad`
      href = `https://gumroad.com/${pathname[3]}`
      break;
    case 'subscribestar':
      service = 'SubscribeStar';
      api = `/api/lookup/cache/${pathname[3]}?service=subscribestar`
      href = `https://subscribestar.adult/${pathname[3]}`
      break;
  }
  fetch(api)
    .then(res => res.text())
    .then(cache => {
      document.title = `${cache} | Kemono`
      resultsView.innerHTML += `
        <li>
          Service: <a href="${href}" target="_blank" rel="noreferrer">${service}</a>
        </li>
        <li>
          User: <a href="${window.location.href.split('?')[0]}">${cache}</a>
        </li>
      `
    })
  if (document.getElementsByName('service')[0].content === 'patreon') {
    fetch(proxy)
      .then(res => res.json())
      .then(user => {
        resultsView.innerHTML += `
          <li>
            Tagline: ${user.included[0].attributes.creation_name}
          </li>
          <li>
            CUF Enabled: ${user.included[0].attributes.is_charge_upfront ? 'Yes' : '<span style="color: #0f0">No</span>' }
          </li>
        `
      })
  }
}

async function main () {
  const paginator = document.getElementById('paginator');
  const skip = Number(getParameterByName('o')) || 0;
  paginator.innerHTML += `
    <menu>
      ${skip >= 50 ? `<li><a href="${window.location.href.split('?')[0]}?o=${skip - 50}">«</a></li>` : '<li class="subtitle">«</li>'}
      ${skip >= 25 ? `<li><a href="${window.location.href.split('?')[0]}?o=${skip - 25}">‹</a></li>` : '<li class="subtitle">‹</li>'}
      <li>offset: ${skip}</li>
      <li><a href="${window.location.href.split('?')[0]}?o=${skip + 25}">›</a></li>
      <li><a href="${window.location.href.split('?')[0]}?o=${skip + 50}">»</a></li>
    </menu>
  `
  const pathname = window.location.pathname.split('/');
  const contentView = document.getElementById('content');
  const mainView = document.getElementById('main');
  let api;
  switch (document.getElementsByName('service')[0].content) {
    case 'patreon':
      api = `/api/user/${pathname[2]}?skip=${skip}`;
      break;
    case 'fanbox':
      api = `/api/fanbox/user/${pathname[3]}?skip=${skip}`;
      break;
    case 'gumroad':
      api = `/api/gumroad/user/${pathname[3]}?skip=${skip}`;
      break;
    case 'subscribestar':
      api = `/api/subscribestar/user/${pathname[3]}?skip=${skip}`;
      break;
  }
  const userPostsData = await fetch(api);
  const userPosts = await userPostsData.json();
  if (userPosts.length === 0) {
    mainView.innerHTML += `
      <h1 class="subtitle">There are no posts.</h1>
      <p class="subtitle">The user either hasn't been imported, or has no more posts beyond this page.</p>
    `
  }
  userPosts.forEach(post => {
    let parent = false;
    const inline = post.content.match(/\bhttps?:\/\/\S+/gi) || [];
    const href = post.service === 'patreon' ? `/user/${post.user}/post/${post.id}` : `/${post.service}/user/${post.user}/post/${post.id}`
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
      src: post.post_type === 'image_file' ? post.post_file.path : undefined,
      title: post.title,
      content: post.content.replace(/(&nbsp;|<([^>]+)>)/ig, ''),
      class: parent ? 'thumb-parent' : undefined,
      href: href
    });
  });
  loadUserInfo();
}

window.onload = () => main();
