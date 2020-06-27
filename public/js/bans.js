window.onload = async () => {
  const bansData = await fetch('/api/bans');
  const bans = await bansData.json();
  bans.map(ban => {
    let href, service;
    switch (ban.service) {
      case 'patreon': {
        service = 'Patreon';
        href = `https://www.patreon.com/user?u=${ban.id}`;
        break;
      }
      case 'fanbox': {
        service = 'Pixiv Fanbox'
        href = `https://www.pixiv.net/fanbox/creator/${ban.id}`;
        break;
      }
      case 'gumroad': {
        service = 'Gumroad'
        href = `https://gumroad.com/${ban.id}`;
        break;
      }
      case 'subscribestar': {
        service = 'SubscribeStar'
        href = `https://subscribestar.adult/${ban.id}`;
        break;
      }
    }
    document.getElementById('bans').innerHTML += `
      <li>
        <a href="${href}">
          ${ban.name} <span class="subtitle">${service}</span>
        </a>
      </li>
    `
  })
};
