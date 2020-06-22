async function loadQuery () {
  const query = document.getElementById('search-input').value;
  const pathname = window.location.pathname.split('/');
  const contentView = document.getElementById('content');
  contentView.innerHTML = '';
  let api;
  switch (document.getElementsByName('service')[0].content) {
    case 'patreon':
      api = `/api/user/${pathname[2]}/lookup?q=${query}`;
      break;
    case 'fanbox':
      api = `/api/fanbox/user/${pathname[3]}/lookup?q=${query}`;
      break;
    case 'gumroad':
      api = `/api/gumroad/user/${pathname[3]}/lookup?q=${query}`;
      break;
    case 'subscribestar':
      api = `/api/subscribestar/user/${pathname[3]}/lookup?q=${query}`;
      break;
  }
  const userPostsData = await fetch(api);
  const userPosts = await userPostsData.json();
  renderPosts(userPosts);
}

async function loadUserInfo () {
  let service, api, proxy, href;
  const infoView = document.getElementById('info-block');
  const patreonView = document.getElementById('extra-info-block');
  const pathname = window.location.pathname.split('/');
  switch (document.getElementsByName('service')[0].content) {
    case 'patreon':
      service = 'Patreon';
      api = `/api/lookup/cache/${pathname[2]}?service=patreon`;
      proxy = `/proxy/user/${pathname[2]}`;
      href = `https://www.patreon.com/user?u=${pathname[2]}`;
      break;
    case 'fanbox':
      service = 'Fanbox';
      api = `/api/lookup/cache/${pathname[3]}?service=fanbox`;
      href = `https://www.pixiv.net/fanbox/creator/${pathname[3]}`;
      break;
    case 'gumroad':
      service = 'Gumroad';
      api = `/api/lookup/cache/${pathname[3]}?service=gumroad`;
      href = `https://gumroad.com/${pathname[3]}`;
      break;
    case 'subscribestar':
      service = 'SubscribeStar';
      api = `/api/lookup/cache/${pathname[3]}?service=subscribestar`;
      href = `https://subscribestar.adult/${pathname[3]}`;
      break;
  }
  fetch(api)
    .then(res => res.text())
    .then(cache => {
      document.title = `${cache} | Kemono`;
      infoView.innerHTML += `
        <li>
          Service: <a href="${href}" target="_blank" rel="noreferrer">${service}</a>
        </li>
        <li>
          User: <a href="${window.location.href.split('?')[0]}">${cache}</a>
        </li>
      `;
    });
  if (document.getElementsByName('service')[0].content === 'patreon') {
    fetch(proxy)
      .then(res => res.json())
      .then(user => {
        patreonView.innerHTML += `
          <li>
            Tagline: ${user.included[0].attributes.creation_name}
          </li>
          <li>
            CUF Enabled: ${user.included[0].attributes.is_charge_upfront ? 'Yes' : '<span style="color: #0f0">No</span>'}
          </li>
        `;
      });
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
  `;
  const pathname = window.location.pathname.split('/');
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
    `;
  }
  renderPosts(userPosts);
  loadUserInfo();
  document.getElementById('search-input').addEventListener('keyup', debounce(() => loadQuery(), 350));
}

window.onload = () => main();
