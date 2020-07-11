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
}

window.onload = () => main();
