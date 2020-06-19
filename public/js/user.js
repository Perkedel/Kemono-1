const headerHTML = data => `
  <div 
    class="user-header-view" 
    style="background: url('${data.bg}'); background-size: 100% auto; background-position: center;"
  >
    <div class="user-header-avatar" style="background-image: url('${data.icon}');"></div>
    <div class="user-header-info">
      <div class="user-header-info-top">
        <h1>${data.title}</h1>
        <a href="${data.href}" target="_blank" rel="noreferrer">
          <div class="user-header-info-${data.service}"></div>
        </a>
      </div>
    </div>
  </div>
`;

async function loadHeader () {
  const marthaView = document.getElementById('martha-view');
  const pathname = window.location.pathname.split('/');
  switch (document.getElementsByName('service')[0].content) {
    case 'patreon': {
      const userData = await fetch(`/proxy/user/${pathname[2]}`);
      const user = await userData.json();
      document.title = `${user.data.attributes.vanity || user.data.attributes.full_name} | Kemono`;
      marthaView.innerHTML = headerHTML({
        bg: user.included ? user.included[0].attributes.cover_photo_url : user.data.attributes.image_url,
        icon: user.included ? user.included[0].attributes.avatar_photo_url : user.data.attributes.image_url,
        title: user.data.attributes.vanity || user.data.attributes.full_name,
        href: `https://www.patreon.com/user?u=${user.data.id}`,
        service: 'patreon'
      }) + marthaView.innerHTML;
      break;
    }
    case 'fanbox': {
      const userData = await fetch(`/proxy/fanbox/user/${pathname[3]}`);
      const user = await userData.json();
      require(['https://unpkg.com/unraw@1.2.5/dist/index.min.js'], unraw => {
        document.title = `${unraw.unraw(user.body.user.name)} | Kemono`;
        const marthaView = document.getElementById('martha-view');
        marthaView.innerHTML = headerHTML({
          bg: unraw.unraw(user.body.coverImageUrl || user.body.user.iconUrl),
          icon: unraw.unraw(user.body.user.iconUrl),
          title: unraw.unraw(user.body.user.name),
          href: `https://www.pixiv.net/fanbox/creator/${user.body.user.userId}`,
          service: 'fanbox'
        }) + marthaView.innerHTML;
      });
      break;
    }
    case 'gumroad': {
      const userData = await fetch(`/proxy/gumroad/user/${pathname[3]}`);
      const user = await userData.json();
      document.title = `${user.name} | Kemono`;
      marthaView.innerHTML = headerHTML({
        bg: user.background || user.avatar,
        icon: user.avatar,
        title: user.name,
        href: `https://gumroad.com/${pathname[3]}`,
        service: 'gumroad'
      }) + marthaView.innerHTML;
      break;
    }
    case 'subscribestar': {
      const userData = await fetch(`/proxy/subscribestar/user/${pathname[3]}`);
      const user = await userData.json();
      document.title = `${user.name} | Kemono`;
      marthaView.innerHTML = headerHTML({
        bg: user.background || user.avatar,
        icon: user.avatar,
        title: user.name,
        href: `https://gumroad.com/${pathname[3]}`,
        service: 'subscribestar'
      }) + marthaView.innerHTML;
    }
  }
}

async function loadMorePosts (skip, after = () => {}) {
  const load = document.getElementById('load-more-button');
  if (load) {
    load.outerHTML = '';
  }
  const pathname = window.location.pathname.split('/');
  const marthaView = document.getElementById('martha-view');
  let api = '';
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
  userPosts.map(post => {
    let image = '';
    let imageDl = '';
    let attachmentDl = '';
    let embed = '';
    post.attachments.map(attachment => {
      attachmentDl += `
        <a 
          class="user-post-attachment-link" 
          href="${attachment.path}" 
          target="_blank"
        >
          <p>Download ${attachment.name}</p>
        </a>
      `;
    });

    if (post.post_type === 'image_file') {
      image = `
        <a class="fileThumb" href="${post.post_file.path}">
          <img 
            class="user-post-image" 
            data-src="${post.post_file.path}"
          >
        </a>
      `;
      imageDl = `
        <a 
          class="user-post-attachment-link" 
          href="${post.post_file.path}" 
          target="_blank"
        >
          <p>Download ${post.post_file.name}</p>
        </a>
      `;
    }

    if (Object.keys(post.embed).length !== 0 && document.getElementsByName('service')[0].content !== 'fanbox') {
      embed = `
        <a href="${post.embed.url}" target="_blank">
          <div class="embed-view">
            <h3>${post.embed.subject}</h3>
            <p>${post.embed.description || ''}</p>
          </div>
        </a>
      `;
    }
    marthaView.innerHTML += `
      <div class="user-post-view" id=${post.id}>
        ${image}
        ${embed}
        <h2>${post.title}</h2>
        ${post.content}
        ${imageDl}
        ${attachmentDl}
        <p style="color: #757575;">${post.published_at}</p>
      </div>
    `;
  });
  marthaView.innerHTML += `
    <button onClick="loadMorePosts(${skip + 25})" id="load-more-button" class="load-more-button">Load More</a>
  `;
  lazyload();
  after();
}

window.onload = () => {
  loadMorePosts(0, () => loadHeader());
};
