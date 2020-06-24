const rowHTML = data => `
  <li>
    <a href="${data.href}">
      ${data.title} <span class="subtitle">${data.subtitle}</span>
    </a>
  </li>
`;

async function renderPatreonQuery (query = '', limit = 10) {
  const resultsView = document.getElementById('results');
  const searchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&service=patreon&limit=${limit}`);
  const results = await searchData.json();
  results.forEach(userId => {
    fetch(`/api/lookup/cache/${userId}?service=patreon`)
      .then(res => res.text())
      .then(cache => {
        resultsView.innerHTML += rowHTML({
          id: `patreon-user-${userId}`,
          href: '/user/' + userId,
          avatar: '',
          title: cache,
          subtitle: 'Patreon'
        });
      });
  });
}

async function renderGumroadQuery (query = '', limit = 10) {
  const resultsView = document.getElementById('results');
  const gumroadSearchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&service=gumroad&limit=${limit}`);
  const gumroadResults = await gumroadSearchData.json();
  gumroadResults.forEach(userId => {
    fetch(`/api/lookup/cache/${userId}?service=gumroad`)
      .then(res => res.text())
      .then(cache => {
        resultsView.innerHTML += rowHTML({
          id: `gumroad-user-${userId}`,
          href: '/gumroad/user/' + userId,
          avatar: '',
          title: cache,
          subtitle: 'Gumroad'
        });
      });
  });
}

async function renderFanboxQuery (query = '', limit = 10) {
  const resultsView = document.getElementById('results');
  const fanboxSearchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&service=fanbox&limit=${limit}`);
  const fanboxResults = await fanboxSearchData.json();
  require(['https://unpkg.com/unraw@1.2.5/dist/index.min.js'], function (unraw) {
    fanboxResults.forEach(userId => {
      fetch(`/api/lookup/cache/${userId}?service=fanbox`)
        .then(res => res.text())
        .then(cache => {
          resultsView.innerHTML += rowHTML({
            id: `fanbox-user-${userId}`,
            href: '/fanbox/user/' + userId,
            avatar: '',
            title: cache,
            subtitle: 'Pixiv Fanbox'
          });
        });
    });
  });
}

async function renderDiscordQuery (query = '', limit = 10) {
  const resultsView = document.getElementById('results');
  const discordSearchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&service=discord&limit=${limit}`);
  const discordResults = await discordSearchData.json();
  discordResults.forEach(userId => {
    fetch(`/api/lookup/cache/${userId}?service=discord`)
      .then(res => res.text())
      .then(cache => {
        resultsView.innerHTML += rowHTML({
          id: `discord-server-${userId}`,
          href: '/discord/server/' + userId,
          avatar: '',
          title: cache,
          subtitle: 'Discord'
        });
      });
  });
}

async function renderSubscribestarQuery (query = '', limit = 10) {
  const resultsView = document.getElementById('results');
  const subscribestarSearchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&service=subscribestar&limit=${limit}`);
  const subscribestarResults = await subscribestarSearchData.json();
  subscribestarResults.forEach(userId => {
    fetch(`/api/lookup/cache/${userId}?service=subscribestar`)
      .then(res => res.text())
      .then(cache => {
        resultsView.innerHTML += rowHTML({
          id: `subscribestar-user-${userId}`,
          href: '/subscribestar/user/' + userId,
          avatar: '',
          title: cache,
          subtitle: 'SubscribeStar'
        });
      });
  });
}

async function queryUpdate (num) {
  const resultsView = document.getElementById('results');
  resultsView.innerHTML = '';
  const service = document.getElementById('service-input').value;
  const query = document.getElementById('search-input').value;
  switch (service) {
    case 'patreon': {
      renderPatreonQuery(query, num);
      break;
    }
    case 'fanbox': {
      renderFanboxQuery(query, num);
      break;
    }
    case 'gumroad': {
      renderGumroadQuery(query, num);
      break;
    }
    case 'discord': {
      renderDiscordQuery(query, num);
      break;
    }
    case 'subscribestar': {
      renderSubscribestarQuery(query, num);
      break;
    }
    default: {
      renderPatreonQuery(query);
      renderFanboxQuery(query);
      renderGumroadQuery(query);
      renderDiscordQuery(query);
      renderSubscribestarQuery(query);
    }
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
  const recentData = await fetch(`/api/recent?skip=${skip}`);
  const recent = await recentData.json();
  renderPosts(recent);
  document.getElementById('search-input').addEventListener('keyup', debounce(() => queryUpdate(), 350));
  document.getElementById('service-input').addEventListener('change', () => queryUpdate(150));
  queryUpdate();
}

window.onload = () => main();
