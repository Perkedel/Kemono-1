const header = props => `
  <ul class="header">
    <li><a href="/">Kemono</a></li>
    <li ${props.currentPage === 'artists' ? 'class="current-page"' : ''}><a href="/artists">Artists</a></li>
    <li ${props.currentPage === 'posts' ? 'class="current-page"' : ''}><a href="/posts">Posts</a></li>
    <li ${props.currentPage === 'help' ? 'class="current-page"' : ''}><a href="/help">Help</a></li>
    <li><a href="https://liberapay.com/kemono.party" target="_blank">Donate</a></li>
  </ul>
`;

module.exports = { header };
