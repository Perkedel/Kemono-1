async function main () {
  const pathname = window.location.pathname.split('/');
  const resultsView = document.getElementById('results');
  let posts, cache;
  switch (document.getElementsByName('service')[0].content) {
    case 'patreon': {
      const postData = await fetch(`/api/user/${pathname[2]}/post/${pathname[4]}`);
      posts = await postData.json();
      const cacheData = await fetch(`/api/lookup/cache/${pathname[2]}?service=patreon`);
      cache = await cacheData.text();
      break;
    }
    case 'gumroad': {
      const postData = await fetch(`/api/gumroad/user/${pathname[3]}/post/${pathname[5]}`);
      posts = await postData.json();
      const cacheData = await fetch(`/api/lookup/cache/${pathname[3]}?service=gumroad`);
      cache = await cacheData.text();
      break;
    }
    case 'subscribestar': {
      const postData = await fetch(`/api/subscribestar/user/${pathname[3]}/post/${pathname[5]}`);
      posts = await postData.json();
      const cacheData = await fetch(`/api/lookup/cache/${pathname[3]}?service=subscribestar`);
      cache = await cacheData.text();
      break;
    }
    default: {
      const postData = await fetch(`/api/fanbox/user/${pathname[3]}/post/${pathname[5]}`);
      posts = await postData.json();
      const cacheData = await fetch(`/api/lookup/cache/${pathname[3]}?service=fanbox`);
      cache = await cacheData.text();
    }
  }

  resultsView.innerHTML += `
    <li>
      User: <a href="../">${cache}</a>
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

  let multipost = posts.length > 1;
  posts.map(post => {
    let previews = '';
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
    }

    if (Object.keys(post.embed).length !== 0) {
      previews += `
        <a href="${post.embed.url}" target="_blank">
          <div class="embed-view">
            ${post.embed.subject ? `<h3>${post.embed.subject}</h3>` : ''}
            ${post.embed.description ? `<p>${post.embed.description}</p>` : ''}
          </div>
        </a>
        <br>
      `;
    }

    post.attachments.map(attachment => {
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
      <h1>${post.title}</h1>
      <p>${post.content}</p>
      ${ multipost ? '<hr>' : '' }
    `;
  })
}

window.onload = () => main();
