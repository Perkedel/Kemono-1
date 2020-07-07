function attemptFlag (e, api) {
  e.preventDefault();
  if (confirm('Are you sure you want to flag this post for reimport?')) {
    fetch(api, { method: 'post' })
      .then(res => {
        window.alert(res.ok ? 'Successfully flagged.' : 'Error. There might already be a flag here.');
      });
  }
}

async function main () {
  const pathname = window.location.pathname.split('/');
  const resultsView = document.getElementById('results');
  let posts, cacheApi, flagApi;
  switch (document.getElementsByName('service')[0].content) {
    case 'patreon': {
      const postData = await fetch(`/api/user/${pathname[2]}/post/${pathname[4]}`);
      posts = await postData.json();
      cacheApi = `/api/lookup/cache/${pathname[2]}?service=patreon`;
      flagApi = `/api/user/${pathname[2]}/post/${pathname[4]}/flag`;
      break;
    }
    case 'gumroad': {
      const postData = await fetch(`/api/gumroad/user/${pathname[3]}/post/${pathname[5]}`);
      posts = await postData.json();
      cacheApi = `/api/lookup/cache/${pathname[3]}?service=gumroad`;
      flagApi = `/api/gumroad/user/${pathname[3]}/post/${pathname[5]}/flag`;
      break;
    }
    case 'subscribestar': {
      const postData = await fetch(`/api/subscribestar/user/${pathname[3]}/post/${pathname[5]}`);
      posts = await postData.json();
      cacheApi = `/api/lookup/cache/${pathname[3]}?service=subscribestar`;
      flagApi = `/api/subscribestar/user/${pathname[3]}/post/${pathname[5]}/flag`;
      break;
    }
    default: {
      const postData = await fetch(`/api/fanbox/user/${pathname[3]}/post/${pathname[5]}`);
      posts = await postData.json();
      cacheApi = `/api/lookup/cache/${pathname[3]}?service=fanbox`;
      flagApi = `/api/fanbox/user/${pathname[3]}/post/${pathname[5]}/flag`;
    }
  }

  fetch(cacheApi)
    .then(data => data.json())
    .then(cache => {
      resultsView.innerHTML += `
        <li>
          User: <a href="../">${cache.name}</a>
        </li>
        <li>
          ID: <a href="">${posts[0].id}</a>
        </li>
        <li>
          Published at: ${posts[0].published_at}
        </li>
        <li>
          Added at: ${new Date(posts[0].added_at).toISOString()}
        </li>
      `;
    })
    .then(() => fetch(flagApi))
    .then(res => {
      resultsView.innerHTML += res.ok ? `
        <li>
          <span class="subtitle">This post has been flagged for reimport.</span>
        </li>
      ` : `
        <li>
          <a href="" id="flag-button">Flag for reimport</a>
        </li>
      `;
      document.getElementById('flag-button').addEventListener('click', e => attemptFlag(e, flagApi));
    });

  const multipost = posts.length > 1;
  posts.forEach(post => {
    let previews = '';
    let attachments = '';
    if (post.post_type === 'image_file' || post.post_type === 'image') {
      previews += `
        <a class="fileThumb" href="${post.post_file.path}">
          <img
            data-src="/thumbnail${post.post_file.path.replace('https://kemono.party', '')}"
            src="/thumbnail${post.post_file.path.replace('https://kemono.party', '')}"
          >
        </a>
        <br>
      `;
    } else if (Object.keys(post.post_file).length !== 0) {
      attachments += `
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
      previews += (/\.(gif|jpe?g|png|webp)$/i).test(attachment.path) ? `
        <a class="fileThumb" href="${attachment.path}">
          <img
            data-src="/thumbnail${attachment.path.replace('https://kemono.party', '')}"
            src="/thumbnail${attachment.path.replace('https://kemono.party', '')}"
          >
        </a>
        <br>
      ` : `
        <a href="${attachment.path}" target="_blank">
          Download ${attachment.name}
        </a>
        <br>
      `;
    });

    const pageView = document.getElementById('page');
    pageView.innerHTML += `
      ${previews}
      ${attachments}
      <h1>${post.title}</h1>
      <p>${post.content}</p>
      ${multipost ? '<hr>' : ''}
    `;
  });
}

window.onload = () => main();
