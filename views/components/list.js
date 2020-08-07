const { preview } = require('./preview');
const { paginator } = require('./paginator');

const list = props => `
  <div class="vertical-views">
    <div class="paginator" id="paginator-top">
      ${paginator({
        query: props.query,
        url: props.url
      })}
    </div>
    <div id="no-posts">
      ${props.posts.length === 0 ? `
        <h1 class="subtitle">Nobody here but us chickens!</h1>
        <p class="subtitle">
          There are no more posts for your query.
        </p>
      ` : ''}
    </div>
    <div class="content" id="content">
      ${props.posts.map(post => preview({ post })).join('')}
    </div>
    <div class="paginator" id="paginator-bottom">
      ${paginator({
        query: props.query,
        url: props.url
      })}
    </div>
  </div> 
`;

module.exports = { list };
