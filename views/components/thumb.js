const thumb = props => `
  <a href="${props.href}" class="thumb-link">
    ${props.src ? `
      <div class="thumb thumb-with-image ${props.class || 'thumb-standard'}">
        <img src="/thumbnail${props.src.replace('https://kemono.party', '')}?size=500">
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
