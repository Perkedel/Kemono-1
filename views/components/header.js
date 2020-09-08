/**
 * Header component.
 * @constructor
 * @param {Object} props
 * @param {String} props.currentPage - The current view being rendered.
 */

const header = props => `
  <ul class="header">
    <li ${props.currentPage === 'artists' ? 'class="current-page"' : ''}><a href="/artists">Artists</a></li>
    <li ${props.currentPage === 'posts' ? 'class="current-page"' : ''}><a href="/posts">Posts</a></li>
    <li ${props.currentPage === 'import' ? 'class="current-page"' : ''}><a href="/importer">Import</a></li>
    <li ${props.currentPage === 'requests' ? 'class="current-page"' : ''}><a href="/requests">Requests</a></li>
    <li ${props.currentPage === 'board' ? 'class="current-page"' : ''}><a href="/board">Board</a></li>
    <li ${props.currentPage === 'help' ? 'class="current-page"' : ''}><a href="/help">Help</a></li>
  </ul>
`;

module.exports = { header };
