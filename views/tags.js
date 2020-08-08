const { buildBooruQueryFromString } = require('../utils/builders');
const { shell, header, subheader, list } = require('./components');

const tags = props => shell(`
  <div class="main">
    ${header({ currentPage: 'posts' })}
    ${subheader({ currentPage: 'posts' })}
    <div class="views">
      <div class="sidebar">
        <div>
          <h5>Search</h5>
          <form action="/posts" accept-charset="UTF-8" method="get">
            <input
              type="text"
              name="tags"
              autocomplete="off"
              value="${props.query.tags || ''}"
            >
            <input type="submit">
          </form>
        </div>
        <div>
          <h5>Tags</h5>
          <ul>
            ${(() => {
              let tags = '';
              const combined = {
                artist: [],
                character: [],
                copyright: [],
                meta: [],
                general: []
              };

              props.posts.map(post => {
                post.tags.artist.map(tag => combined.artist.includes(tag) ? null : combined.artist.push(tag));
                post.tags.character.map(tag => combined.character.includes(tag) ? null : combined.character.push(tag));
                post.tags.copyright.map(tag => combined.copyright.includes(tag) ? null : combined.copyright.push(tag));
                post.tags.meta.map(tag => combined.meta.includes(tag) ? null : combined.meta.push(tag));
                post.tags.general.map(tag => combined.general.includes(tag) ? null : combined.general.push(tag));
              });

              combined.artist.map(tag => (tags += `<li class="tag-artist"><a title="artist:${tag.replace(/ +/g, '_')}" href="/posts?tags=artist%3A${tag.replace(/ +/g, '_')}">${tag}</a></li>`));
              combined.character.map(tag => (tags += `<li class="tag-character"><a title="character:${tag.replace(/ +/g, '_')}" href="/posts?tags=character%3A${tag.replace(/ +/g, '_')}">${tag}</a></li>`));
              combined.copyright.map(tag => (tags += `<li class="tag-copyright"><a title="copyright:${tag.replace(/ +/g, '_')}" href="/posts?tags=copyright%3A${tag.replace(/ +/g, '_')}">${tag}</a></li>`));
              combined.meta.map(tag => (tags += `<li class="tag-meta"><a title="meta:${tag.replace(/ +/g, '_')}" href="/posts?tags=meta%3A${tag.replace(/ +/g, '_')}">${tag}</a></li>`));
              combined.general.map(tag => (tags += `<li><a title="${tag.replace(/ +/g, '_')}" href="/posts?tags=${tag.replace(/ +/g, '_')}">${tag}</a></li>`));

              return tags;
            })()}
          </ul>
        </div>
        <div id="additional-info">
        </div>
        <div>
          <h5>Options</h5>
          <ul>
            <li><a href="/posts/random${props.query.tags ? `?tags=${props.query.tags}` : ''}">Random</a></li>
            <li><a href="/posts/rss${props.query.tags ? `?tags=${props.query.tags}` : ''}">RSS</a></li>
          </ul>
        </div>
      </div>
      ${list({
        query: props.query,
        url: props.url,
        posts: props.posts
      })}
    </div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>
  <script src="/js/utils.js"></script>
  <script src="/js/tags.js"></script>
`, {
  service: buildBooruQueryFromString(props.query.tags || '').service,
  user: buildBooruQueryFromString(props.query.tags || '').user
});

module.exports = { tags };
