const dfmt = require('dateformat');
dfmt.masks['4time'] = 'mm/dd/yy(ddd)HH:MM:ss'

const reply = props => `
  <div class="bbs-post bbs-reply" id="${props.id}">
    <div class="bbs-post-info">
      <span class="bbs-post-name">${props.name}</span>
      <span class="bbs-post-time">${dfmt(new Date(), '4time')}</span>
      <a class="bbs-post-link" href="#${props.id}">No. ${props.id}</a>
    </div>
    ${props.image ? `
      <div class="bbs-post-file">
        <a class="bbs-post-img" href="/board/images/${props.image.filename}" target="_blank">
          <img src="/thumbnail/board/images/${props.image.filename}?size=150">
        </a>
      </div>
    ` : ''}
    <div class="bbs-post-body">
      <p>${props.body}</p>
    </div>
  </div>
`

module.exports = { reply }