const thumb = props => `
  <a href="${props.href}" class="thumb-link">
    ${props.src ? `
      <div class="thumb thumb-with-image ${props.class || 'thumb-standard'}">
        <img src="https://images.weserv.nl/?url=https://kemono.party${props.src.replace('https://kemono.party', '')}&width=500&output=jpg&we">
      </div>
    ` : `
      <div class="thumb thumb-with-text ${props.class || 'thumb-standard'}">
        <h3>${props.title}</h3>
        <p>${props.content}</p>
      </div>
    `}
  </a>
`;

module.exports = { thumb };
