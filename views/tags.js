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
            <input type="submit" name="commit" value="Search">
          </form>
        </div>
        <div>
          <h5>Tags</h5>
          ${Object.keys(props.tags).map(namespace => {
            return `
              ${props.tags[namespace].map(tag => `<li ${namespace !== 'general' ? `class="tag-${namespace}` : ''}"><a href="/posts?tags=${namespace !== 'general' ? `${namespace}%3A` : ''}${tag.replace(/ +/g, '_')}&commit=Search">${tag}</a></li>`).join('')}
            `
          }).join('')}
        </div>
        <div>
          <h5>Options</h5>
          <ul>
            <li><a href="/posts/random${props.query.tags ? `?tags=${props.query.tags}` : ''}">Random</a></li>
          </ul>
        </div>
      </div>
      ${list({
        o: props.query.o,
        url: props.url,
        posts: props.posts
      })}
    </div>
  </div>
`);

module.exports = { tags };
