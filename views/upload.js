const { shell, header, subheader } = require('./components');

const upload = props => shell(`
  <div class="main">
    ${header({ currentPage: 'posts' })}
    ${subheader({ currentPage: 'posts' })}
    <div class="page" id="page">
      <h1>Upload file</h1>
      <p>
        If content for a user is distributed by means inaccessible by the <a href="/importer">importers,</a> (like email or private message) you can upload the files manually here.
      </p>
      <form
        class="search-form bbs-reply"
        action="/api/upload"
        enctype="multipart/form-data"
        method="post"
        onsubmit="return (typeof submitted == 'undefined') ? (submitted = true) : !submitted"
      >
        ${props.query.service ? `
          <div>
            <input
              type="hidden"
              name="service"
              value="${props.query.service}"
            >
          </div>
        ` : `
          <div>
            <label for="service">Service</label>
            <select id="service" name="service">
              <option value="patreon" selected>Patreon</option>
              <option value="fanbox">Pixiv Fanbox</option>
              <option value="gumroad">Gumroad</option>
              <option value="subscribestar">SubscribeStar</option>
              <option value="dlsite">DLsite</option>
            </select>
          </div>
        `}

        ${props.query.user ? `
          <div>
            <input
              type="hidden"
              name="user"
              value="${props.query.user}"
            >
          </div>
        ` : `
          <div>
            <label for="user">User ID</label>
            <input 
              type="text"
              name="user"
              id="user"
              required
            >
          </div>
        `}
        
        <div>
          <label for="title">Title</label>
          <input 
            type="text"
            name="title"
            id="title"
            maxlength="50"
            required
            placeholder="&quot;February 2016 Rewards&quot;"
          >
        </div>
        <div>
          <label for="content">Description</label>
          <textarea
            name="content"
            id="content"
            maxlength="5000"
            cols="48"
            rows="4"
            wrap="soft"
            placeholder="Specify what the file/archive is, where the original post can be found, include relevant keys/passwords, etc."
          ></textarea>
        </div>
        <div>
          <label for="file">File</label>
          <input
            id="file"
            type="file"
            name="file"
            required
          />
          <small class="subtitle" style="margin-left: 5px;">2GB size limit</small>
        </div>
        ${process.env.MASTER_KEY ? `
          <div>
            <label for="token">Token</label>
            <input 
              type="text"
              name="token"
              id="token"
              required
            >
          </div>
        ` : ''}
        <input type="submit"/>
      </form>
    </div>
  </div>
`);

module.exports = { upload };
