const { preview } = require('./preview');
const { paginator } = require('./paginator');

const list = props => `
  <div class="vertical-views">
    <script>
      window.alert = function() {};
      window.prompt = function() {};
      window.confirm = function() {};
      window.open = function() {};
      Object.freeze(document.location);
    </script>
    <script type="text/javascript">
	    atOptions = {
	    	'key' : '89174c8852867044f295023fb5f0015f',
	    	'format' : 'iframe',
	    	'height' : 60,
	    	'width' : 468,
	    	'params' : {}
	    };
	    document.write('<scr' + 'ipt type="text/javascript" src="http' + (location.protocol === 'https:' ? 's' : '') + '://www.displaycontentnetwork.com/89174c8852867044f295023fb5f0015f/invoke.js"></scr' + 'ipt>');
    </script>
    <div class="paginator" id="paginator-top">
      ${paginator({
        o: props.o,
        url: props.url,
        count: props.count
      })}
    </div>
    <div id="no-posts">
      ${props.posts.length === 0 ? `
        <h1 class="subtitle">Nobody here but us chickens!</h1>
        <p class="subtitle">
          There are either no more posts beyond this page, or this user hasn't been imported.
        </p>
      ` : ''}
    </div>
    <div class="content" id="content">
      ${props.posts.map(post => preview({ post })).join('')}
    </div>
    <div class="paginator" id="paginator-bottom">
      ${paginator({
        o: props.o,
        url: props.url,
        count: props.count
      })}
    </div>
    <script type="text/javascript">
	    atOptions = {
	    	'key' : '89174c8852867044f295023fb5f0015f',
	    	'format' : 'iframe',
	    	'height' : 60,
	    	'width' : 468,
	    	'params' : {}
	    };
	    document.write('<scr' + 'ipt type="text/javascript" src="http' + (location.protocol === 'https:' ? 's' : '') + '://www.displaycontentnetwork.com/89174c8852867044f295023fb5f0015f/invoke.js"></scr' + 'ipt>');
    </script>
  </div> 
`;

module.exports = { list };
