const form = props => `
  <form
    class="search-form bbs-reply"
    action="${props.action}"
    enctype="multipart/form-data"
    method="post"
  >
    <div>
      <label for="name">Name</label>
      <input 
        type="text"
        name="name"
        id="name"
        placeholder="Anonymous"
        maxlength="100"
      >
      <small class="subtitle" style="margin-left: 5px;">Tripcodes supported</small>
    </div>
    ${props.op ? `
      <div>
        <label for="subject">Subject</label>
        <input 
          type="text"
          name="subject"
          id="subject"
          maxlength="50"
          required
        >
      </div>
    ` : ''}
    <div>
      <label for="body">Body</label>
      <textarea
        name="body"
        id="body"
        maxlength="5000"
        cols="48"
        rows="4"
        wrap="soft"
        required
      ></textarea>
    </div>
    <div>
      <label for="image">Image</label>
      <input
        id="image"
        type="file"
        name="image"
        accept="image/gif,image/jpeg,image/png"
        ${props.op ? 'required' : ''}
      />
      <small class="subtitle" style="margin-left: 5px;">1MB size limit</small>
    </div>
    <input type="submit"/>
  </form>
`

module.exports = { form };