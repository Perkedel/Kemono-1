const paginator = props => {
  let skip = Number(props.o) || 0;
  return `
    <menu>
      ${skip >= 50 ? `<li><a href="${props.url}?o=${skip - 50}" title="-50">«</a></li>` : '<li class="subtitle">«</li>'}
      ${skip >= 25 ? `<li><a href="${props.url}?o=${skip - 25}" title="-25">‹</a></li>` : '<li class="subtitle">‹</li>'}
      <li>offset: ${skip}</li>
      <li><a href="${props.url}?o=${skip + 25}" title="+25">›</a></li>
      <li><a href="${props.url}?o=${skip + 50}" title="+50">»</a></li>
    </menu>
  `;
}

module.exports = { paginator }