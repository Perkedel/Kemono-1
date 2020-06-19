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
      <div id="${data.id}-avatar" class="avatar"></div>
      </a>
      <div style="display: inline-block">
        <a class="link-reset" href="${data.href}">
          <p><b id="${data.id}-title">${data.title}</b></p>
        </a>
        <a class="link-reset" href="${data.href}">
          <p id="${data.id}-subtitle">${data.subtitle}</p>
        </a>
      </div>
    </div>
  </div>
`;

const thumbHTML = data => `
  ${data.src ? `
    <div class="thumb thumb-with-image ${data.class || 'thumb-standard'}">
      <img src="${data.src}">
    </div>
  ` : `
    <div class="thumb thumb-with-text ${data.class || 'thumb-standard'}">
      <h3>${data.title}</h3>
      <p>${data.content}</p>
    </div>
  `}
`;

async function renderPatreonQuery (query = '', limit = 50) {
  const marthaView = document.getElementById('recent-view');
  const searchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&service=patreon&limit=${limit}`);
  const results = await searchData.json();
  results.forEach(userId => {
    fetch(`/api/lookup/cache/${userId}?service=patreon`)
      .then(res => res.text())
      .then(cache => {
        marthaView.innerHTML += rowHTML({
          id: `patreon-user-${userId}`,
          href: '/user/' + userId,
          avatar: '',
          title: cache,
          subtitle: 'Patreon'
        });
      })
      .then(() => fetch(`/proxy/user/${userId}`))
      .then(res => res.json())
      .then(user => {
        const avatar = user.included ? user.included[0].attributes.avatar_photo_url : user.data.attributes.image_url;
        document.getElementById(`patreon-user-${userId}-avatar`).setAttribute('style', `background-image: url('${avatar}');`);
        document.getElementById(`patreon-user-${userId}-title`).innerHTML = user.data.attributes.vanity || user.data.attributes.full_name;
      });
  });
}

async function renderGumroadQuery (query = '', limit = 50) {
  const marthaView = document.getElementById('recent-view');
  const gumroadSearchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&service=gumroad&limit=${limit}`);
  const gumroadResults = await gumroadSearchData.json();
  gumroadResults.forEach(userId => {
    fetch(`/api/lookup/cache/${userId}?service=gumroad`)
      .then(res => res.text())
      .then(cache => {
        marthaView.innerHTML += rowHTML({
          id: `gumroad-user-${userId}`,
          href: '/gumroad/user/' + userId,
          avatar: '',
          title: cache,
          subtitle: 'Gumroad'
        });
      })
      .then(() => fetch(`/proxy/gumroad/user/${userId}`))
      .then(res => res.json())
      .then(user => {
        const avatar = user.avatar;
        document.getElementById(`gumroad-user-${userId}-avatar`).setAttribute('style', `background-image: url('${avatar}');`);
        document.getElementById(`gumroad-user-${userId}-title`).innerHTML = user.name;
      });
  });
}

async function renderFanboxQuery (query = '', limit = 50) {
  const marthaView = document.getElementById('recent-view');
  const fanboxSearchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&service=fanbox&limit=${limit}`);
  const fanboxResults = await fanboxSearchData.json();
  require(['https://unpkg.com/unraw@1.2.5/dist/index.min.js'], function (unraw) {
    fanboxResults.forEach(userId => {
      fetch(`/api/lookup/cache/${userId}?service=fanbox`)
        .then(res => res.text())
        .then(cache => {
          marthaView.innerHTML += rowHTML({
            id: `fanbox-user-${userId}`,
            href: '/fanbox/user/' + userId,
            avatar: '',
            title: cache,
            subtitle: 'Pixiv Fanbox'
          });
        })
        .then(() => fetch(`/proxy/fanbox/user/${userId}`))
        .then(res => res.json())
        .then(user => {
          const avatar = unraw.unraw(user.body.user.iconUrl);
          document.getElementById(`fanbox-user-${userId}-avatar`).setAttribute('style', `background-image: url('${avatar}');`);
          document.getElementById(`fanbox-user-${userId}-title`).innerHTML = unraw.unraw(user.body.user.name);
        });
    });
  });
}

async function renderDiscordQuery (query = '', limit = 50) {
  const marthaView = document.getElementById('recent-view');
  const discordSearchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&service=discord&limit=${limit}`);
  const discordResults = await discordSearchData.json();
  discordResults.forEach(userId => {
    fetch(`/api/lookup/cache/${userId}?service=discord`)
      .then(res => res.text())
      .then(cache => {
        marthaView.innerHTML += rowHTML({
          id: `discord-server-${userId}`,
          href: '/discord/server/' + userId,
          avatar: '',
          title: cache,
          subtitle: 'Discord'
        });
      })
      .then(() => fetch(`/proxy/discord/server/${userId}`))
      .then(res => res.json())
      .then(user => {
        const avatar = `https://cdn.discordapp.com/icons/${userId}/${user[0].icon}?size=256`;
        document.getElementById(`discord-server-${userId}-avatar`).setAttribute('style', `background-image: url('${avatar}');`);
        document.getElementById(`discord-server-${userId}-title`).innerHTML = user[0].name;
      });
  });
}

async function renderSubscribestarQuery (query = '', limit = 50) {
  const marthaView = document.getElementById('recent-view');
  const subscribestarSearchData = await fetch(`/api/lookup?q=${encodeURIComponent(query)}&service=subscribestar&limit=${limit}`);
  const subscribestarResults = await subscribestarSearchData.json();
  subscribestarResults.forEach(userId => {
    fetch(`/api/lookup/cache/${userId}?service=subscribestar`)
      .then(res => res.text())
      .then(cache => {
        marthaView.innerHTML += rowHTML({
          id: `subscribestar-user-${userId}`,
          href: '/subscribestar/user/' + userId,
          avatar: '',
          title: cache,
          subtitle: 'SubscribeStar'
        });
      })
      .then(() => fetch(`/proxy/subscribestar/user/${userId}`))
      .then(res => res.json())
      .then(user => {
        const avatar = user.avatar;
        document.getElementById(`subscribestar-user-${userId}-avatar`).setAttribute('style', `background-image: url('${avatar}');`);
        document.getElementById(`subscribestar-user-${userId}-title`).innerHTML = user.name;
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
  const contentView = document.getElementById('content');
  const recentData = await fetch('/api/recent');
  const recent = await recentData.json();
  recent.forEach(post => {
    switch (post.service) {
      case 'patreon': {
        let parent = false;
        let inline = post.content.match(/\bhttps?:\/\/\S+/gi) || []
        inline.map(url => {
          if ((/\.(gif|jpe?g|png|webp)$/i).test(url)) {
            parent = true;
            contentView.innerHTML += thumbHTML({
              src: url,
              class: 'thumb-child'
            });
          }
        })
        post.attachments.map(attachment => {
          if ((/\.(gif|jpe?g|png|webp)$/i).test(attachment.path)) {
            parent = true;
            contentView.innerHTML += thumbHTML({
              src: attachment.path,
              class: 'thumb-child'
            });
          }
        });
        contentView.innerHTML += thumbHTML({
          src: post.post_type === 'image_file' ? post.post_file.path : undefined,
          title: post.title,
          content: post.content.replace(/(&nbsp;|<([^>]+)>)/ig, ''),
          class: parent ? 'thumb-parent' : undefined
        });
        break;
      }
    //   case 'gumroad': {
    //     fetch(`/api/lookup/cache/${post.user}?service=gumroad`)
    //       .then(res => res.text())
    //       .then(cache => {
    //         marthaView.innerHTML += rowHTML({
    //           id: `gumroad-post-${post.id}`,
    //           href: '/gumroad/user/' + post.user,
    //           avatar: '',
    //           title: post.title,
    //           subtitle: cache
    //         });
    //       })
    //       .then(() => fetch(`/proxy/gumroad/user/${post.user}`))
    //       .then(res => res.json())
    //       .then(user => {
    //         const avatar = user.avatar;
    //         document.getElementById(`gumroad-post-${post.id}-avatar`).setAttribute('style', `background-image: url('${avatar}');`);
    //         document.getElementById(`gumroad-post-${post.id}-subtitle`).innerHTML = user.name;
    //       });
    //     break;
    //   }
    //   case 'subscribestar': {
    //     fetch(`/api/lookup/cache/${post.user}?service=subscribestar`)
    //       .then(res => res.text())
    //       .then(cache => {
    //         marthaView.innerHTML += rowHTML({
    //           id: `subscribestar-post-${post.id}`,
    //           href: '/subscribestar/user/' + post.user,
    //           avatar: '',
    //           title: post.title,
    //           subtitle: cache
    //         });
    //       })
    //       .then(() => fetch(`/proxy/subscribestar/user/${post.user}`))
    //       .then(res => res.json())
    //       .then(user => {
    //         const avatar = user.avatar;
    //         document.getElementById(`subscribestar-post-${post.id}-avatar`).setAttribute('style', `background-image: url('${avatar}');`);
    //         document.getElementById(`subscribestar-post-${post.id}-subtitle`).innerHTML = user.name;
    //       });
    //     break;
    //   }
    //   case 'fanbox': {
    //     require(['https://unpkg.com/unraw@1.2.5/dist/index.min.js'], function (unraw) {
    //       fetch(`/api/lookup/cache/${post.user}?service=fanbox`)
    //         .then(res => res.text())
    //         .then(cache => {
    //           marthaView.innerHTML += rowHTML({
    //             id: `fanbox-post-${post.id}`,
    //             href: '/fanbox/user/' + post.user,
    //             avatar: '',
    //             title: post.title,
    //             subtitle: cache
    //           });
    //         })
    //         .then(() => fetch(`/proxy/fanbox/user/${post.user}`))
    //         .then(res => res.json())
    //         .then(user => {
    //           const avatar = unraw.unraw(user.body.user.iconUrl);
    //           document.getElementById(`fanbox-post-${post.id}-avatar`).setAttribute('style', `background-image: url('${avatar}');`);
    //           document.getElementById(`fanbox-post-${post.id}-subtitle`).innerHTML = unraw.unraw(user.body.user.name);
    //         });
    //     });
    //     break;
    //   }
    //   default: {
    //     fetch(`/api/lookup/cache/${post.user}?service=patreon`)
    //       .then(res => res.text())
    //       .then(cache => {
    //         marthaView.innerHTML += rowHTML({
    //           id: `patreon-post-${post.id}`,
    //           href: '/user/' + post.user,
    //           avatar: '',
    //           title: post.title,
    //           subtitle: cache
    //         });
    //       })
    //       .then(() => fetch(`/proxy/user/${post.user}`))
    //       .then(res => res.json())
    //       .then(user => {
    //         const avatar = user.included ? user.included[0].attributes.avatar_photo_url : user.data.attributes.image_url;
    //         document.getElementById(`patreon-post-${post.id}-avatar`).setAttribute('style', `background-image: url('${avatar}');`);
    //         document.getElementById(`patreon-post-${post.id}-subtitle`).innerHTML = user.data.attributes.vanity || user.data.attributes.full_name;
    //       });
    //   }
    }
  });
  // document.getElementById('search-input').addEventListener('keyup', debounce(() => queryUpdate(), 350));
  // document.getElementById('service-input').addEventListener('change', () => serviceUpdate());
}

window.onload = () => main();
