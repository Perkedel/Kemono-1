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

const rowHTML = data => `
  <div class="recent-row">
    <div class="recent-row-container">
      <a href="${data.href}">
      <div class="avatar" style="background-image: url('${data.avatar}');"></div>
      </a>
      <div style="display: inline-block">
        <a class="link-reset" href="${data.href}">
          <p><b>${data.title}</b></p>
        </
        <a class="link-reset" href="${data.href}">
          <p>${data.subtitle}</p>
        </a>
      </div>
    </div>
  </div>
`;

async function renderPatreonQuery (query = '', limit = 50) {
  const marthaView = document.getElementById('recent-view');
  const searchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&limit=${limit}`);
  const results = await searchData.json();
  results.map(async (userId) => {
    const userData = await fetch(`/proxy/user/${userId}`);
    const user = await userData.json();
    marthaView.innerHTML += rowHTML({
      href: '/user/' + userId,
      avatar: user.included[0].attributes.avatar_photo_url,
      title: user.data.attributes.vanity || user.data.attributes.full_name,
      subtitle: 'Patreon'
    });
  });
}

async function renderGumroadQuery (query = '', limit = 50) {
  const marthaView = document.getElementById('recent-view');
  const gumroadSearchData = await fetch(`/api/gumroad/lookup?q=${encodeURIComponent(query)}&limit=${limit}`);
  const gumroadResults = await gumroadSearchData.json();
  gumroadResults.map(async (userId) => {
    const userData = await fetch(`/proxy/gumroad/user/${userId}`);
    const user = await userData.json();
    marthaView.innerHTML += rowHTML({
      href: '/gumroad/user/' + userId,
      avatar: user.avatar,
      title: user.name,
      subtitle: 'Gumroad'
    });
  });
}

async function renderFanboxQuery (query = '', limit = 50) {
  const marthaView = document.getElementById('recent-view');
  const fanboxSearchData = await fetch(`/api/fanbox/lookup?q=${encodeURIComponent(query)}&limit=${limit}`);
  const fanboxResults = await fanboxSearchData.json();
  require(['https://unpkg.com/unraw@1.2.5/dist/index.min.js'], function (unraw) {
    fanboxResults.map(async (userId) => {
      const userData = await fetch(`/proxy/fanbox/user/${userId}`);
      const user = await userData.json();
      marthaView.innerHTML += rowHTML({
        href: '/fanbox/user/' + userId,
        avatar: unraw.unraw(user.body.user.iconUrl),
        title: unraw.unraw(user.body.user.name),
        subtitle: 'Pixiv Fanbox'
      });
    });
  });
}

async function renderDiscordQuery (query = '', limit = 50) {
  const marthaView = document.getElementById('recent-view');
  const discordSearchData = await fetch(`/api/discord/lookup?q=${encodeURIComponent(query)}&limit=${limit}`);
  const discordResults = await discordSearchData.json();
  discordResults.map(async (userId) => {
    const userData = await fetch(`/proxy/discord/server/${userId}`);
    const user = await userData.json();
    marthaView.innerHTML += rowHTML({
      href: '/discord/server/' + userId,
      avatar: `https://cdn.discordapp.com/icons/${userId}/${user[0].icon}?size=256`,
      title: user[0].name,
      subtitle: 'Discord'
    });
  });
}

async function renderSubscribestarQuery (query = '', limit = 50) {
  const marthaView = document.getElementById('recent-view');
  const subscribestarSearchData = await fetch(`/api/subscribestar/lookup?q=${encodeURIComponent(query)}&limit=${limit}`);
  const subscribestarResults = await subscribestarSearchData.json();
  subscribestarResults.map(async (userId) => {
    const userData = await fetch(`/proxy/subscribestar/user/${userId}`);
    const user = await userData.json();
    marthaView.innerHTML += rowHTML({
      href: '/subscribestar/user/' + userId,
      avatar: user.avatar,
      title: user.name,
      subtitle: 'SubscribeStar'
    });
  });
}

async function serviceUpdate () {
  const marthaView = document.getElementById('recent-view');
  marthaView.innerHTML = '';
  const query = document.getElementById('service-input').value;
  switch (query) {
    case 'patreon': {
      renderPatreonQuery('', 150);
      break;
    }
    case 'fanbox': {
      renderFanboxQuery('', 150);
      break;
    }
    case 'gumroad': {
      renderGumroadQuery('', 150);
      break;
    }
    case 'discord': {
      renderDiscordQuery('', 150);
      break;
    }
    case 'subscribestar': {
      renderSubscribestarQuery('', 150);
      break;
    }
  }
}

async function queryUpdate () {
  const marthaView = document.getElementById('recent-view');
  marthaView.innerHTML = '';
  const query = document.getElementById('search-input').value;
  renderPatreonQuery(query);
  renderFanboxQuery(query);
  renderGumroadQuery(query);
  renderDiscordQuery(query);
  renderSubscribestarQuery(query);
}

async function main () {
  const recentData = await fetch('/api/recent');
  const recent = await recentData.json();
  recent.map(async (post) => {
    switch (post.service) {
      case 'patreon': {
        const userData = await fetch(`/proxy/user/${post.user}`);
        const user = await userData.json();
        const marthaView = document.getElementById('recent-view');
        let avatar = user.included ? user.included[0].attributes.avatar_photo_url : user.data.attributes.image_url;
        marthaView.innerHTML += rowHTML({
          href: '/user/' + user.data.id,
          avatar: avatar,
          title: post.title,
          subtitle: user.data.attributes.vanity || user.data.attributes.full_name
        });
        break;
      }
      case 'gumroad': {
        const userData = await fetch(`/proxy/gumroad/user/${post.user}`);
        const user = await userData.json();
        const marthaView = document.getElementById('recent-view');
        marthaView.innerHTML += rowHTML({
          href: '/gumroad/user/' + post.user,
          avatar: user.avatar,
          title: post.title,
          subtitle: user.name
        });
        break;
      }
      case 'subscribestar': {
        const userData = await fetch(`/proxy/subscribestar/user/${post.user}`);
        const user = await userData.json();
        const marthaView = document.getElementById('recent-view');
        marthaView.innerHTML += rowHTML({
          href: '/subscribestar/user/' + post.user,
          avatar: user.avatar,
          title: post.title,
          subtitle: user.name
        });
        break;
      }
      case 'fanbox': {
        require(['https://unpkg.com/unraw@1.2.5/dist/index.min.js'], function (unraw) {
          fetch(`/proxy/fanbox/user/${post.user}`)
            .then(userData => userData.json())
            .then(user => {
              const marthaView = document.getElementById('recent-view');
              marthaView.innerHTML += rowHTML({
                href: '/fanbox/user/' + post.user,
                avatar: unraw.unraw(user.body.user.iconUrl),
                title: post.title,
                subtitle: unraw.unraw(user.body.user.name)
              });
            });
        });
        break;
      }
      default: {
        const userData = await fetch(`/proxy/user/${post.user}`);
        const user = await userData.json();
        const marthaView = document.getElementById('recent-view');
        let avatar = user.included ? user.included[0].attributes.avatar_photo_url : user.data.attributes.image_url;
        marthaView.innerHTML += rowHTML({
          href: '/user/' + user.data.id,
          avatar: avatar,
          title: post.title,
          subtitle: user.name
        });
      }
    }
  });
  document.getElementById('search-input').addEventListener('keyup', debounce(() => queryUpdate(), 350));
  document.getElementById('service-input').addEventListener('change', () => serviceUpdate());
}

main();
