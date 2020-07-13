const subheader = props => ({
  posts: `
    <ul class="subheader">
      <li><a href="/posts">List</a></li>
      <li><a href="/importer">Import</a></li>
      <li><a href="/random">Random</a></li>
      <li><a href="/help/posts">Help</a></li>
    </ul>
  `,
  artists: `
    <ul class="subheader">
      <li><a href="">List</a></li>
    </ul>
  `
})[props.currentPage];

module.exports = { subheader };
