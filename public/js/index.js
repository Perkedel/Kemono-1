require.config({
  paths: {
    oboe: 'https://unpkg.com/oboe@2.1.5/dist/oboe-browser.min'
  }
});

const rowHTML = data => `
  <li>
    <a href="${data.href}">
      ${data.title} <span class="subtitle">${data.subtitle}</span>
    </a>
  </li>
`;

function renderPatreonQuery (query = '', limit = 10) {
  const resultsView = document.getElementById('results');
  require(['oboe'], oboe => {
    oboe(`/api/lookup?q=${encodeURIComponent(query)}&service=patreon&limit=${limit}`)
      .node('!.*', userId => {
        fetch(`/api/lookup/cache/${userId}?service=patreon`)
          .then(res => res.json())
          .then(cache => {
            resultsView.innerHTML += rowHTML({
              id: `patreon-user-${userId}`,
              href: '/user/' + userId,
              avatar: '',
              title: cache.name,
              subtitle: 'Patreon'
            });
          });
      });
  });
}

function renderGumroadQuery (query = '', limit = 10) {
  const resultsView = document.getElementById('results');
  require(['oboe'], oboe => {
    oboe(`/api/lookup?q=${encodeURIComponent(query)}&service=gumroad&limit=${limit}`)
      .node('!.*', userId => {
        fetch(`/api/lookup/cache/${userId}?service=gumroad`)
          .then(res => res.json())
          .then(cache => {
            resultsView.innerHTML += rowHTML({
              id: `gumroad-user-${userId}`,
              href: '/gumroad/user/' + userId,
              avatar: '',
              title: cache.name,
              subtitle: 'Gumroad'
            });
          });
      });
  });
}

function renderFanboxQuery (query = '', limit = 10) {
  const resultsView = document.getElementById('results');
  require(['oboe'], oboe => {
    oboe(`/api/lookup?q=${encodeURIComponent(query)}&service=fanbox&limit=${limit}`)
      .node('!.*', userId => {
        fetch(`/api/lookup/cache/${userId}?service=fanbox`)
          .then(res => res.json())
          .then(cache => {
            resultsView.innerHTML += rowHTML({
              id: `fanbox-user-${userId}`,
              href: '/fanbox/user/' + userId,
              avatar: '',
              title: cache.name,
              subtitle: 'Pixiv Fanbox'
            });
          });
      });
  });
}

function renderDiscordQuery (query = '', limit = 10) {
  const resultsView = document.getElementById('results');
  require(['oboe'], oboe => {
    oboe(`/api/lookup?q=${encodeURIComponent(query)}&service=discord&limit=${limit}`)
      .node('!.*', userId => {
        fetch(`/api/lookup/cache/${userId}?service=discord`)
          .then(res => res.json())
          .then(cache => {
            resultsView.innerHTML += rowHTML({
              id: `discord-server-${userId}`,
              href: '/discord/server/' + userId,
              avatar: '',
              title: cache.name,
              subtitle: 'Discord'
            });
          });
      });
  });
}

function renderSubscribestarQuery (query = '', limit = 10) {
  const resultsView = document.getElementById('results');
  require(['oboe'], oboe => {
    oboe(`/api/lookup?q=${encodeURIComponent(query)}&service=subscribestar&limit=${limit}`)
      .node('!.*', userId => {
        fetch(`/api/lookup/cache/${userId}?service=subscribestar`)
          .then(res => res.json())
          .then(cache => {
            resultsView.innerHTML += rowHTML({
              id: `subscribestar-user-${userId}`,
              href: '/subscribestar/user/' + userId,
              avatar: '',
              title: cache.name,
              subtitle: 'SubscribeStar'
            });
          });
      });
  });
}

function queryUpdate (num) {
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
  const paginatorTop = document.getElementById('paginator-top');
  const paginatorBottom = document.getElementById('paginator-bottom');
  const skip = Number(getParameterByName('o')) || 0;
  paginatorTop.innerHTML += paginatorBottom.innerHTML += `
    <menu>
      ${skip >= 50 ? `<li><a href="${window.location.href.split('?')[0]}?o=${skip - 50}" title="-50">«</a></li>` : '<li class="subtitle">«</li>'}
      ${skip >= 25 ? `<li><a href="${window.location.href.split('?')[0]}?o=${skip - 25}" title="-25">‹</a></li>` : '<li class="subtitle">‹</li>'}
      <li>offset: ${skip}</li>
      <li><a href="${window.location.href.split('?')[0]}?o=${skip + 25}" title="+25">›</a></li>
      <li><a href="${window.location.href.split('?')[0]}?o=${skip + 50}" title="+50">»</a></li>
    </menu>
  `;
  require(['oboe'], oboe => {
    oboe(`/api/recent?skip=${skip}`)
      .node('!.*', post => renderPost(post));
  });
  document.getElementById('search-input').addEventListener('keyup', debounce(() => queryUpdate(150), 350));
  document.getElementById('service-input').addEventListener('change', () => queryUpdate(150));
  queryUpdate(150);
}

window.onload = () => main();
