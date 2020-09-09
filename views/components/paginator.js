const qs = require('qs');
const merge = require('deepmerge');

const paginator = props => {
  const skip = Number(props.o) || 0;
  return `
    <menu>
      ${skip >= 50 ? `<li><a href="${props.url.split('?')[0]}?${qs.stringify(merge(props.query, { o: skip - 50 }))}" title="-50">«</a></li>` : '<li class="subtitle">«</li>'}
      ${skip >= 25 ? `<li><a href="${props.url.split('?')[0]}?${qs.stringify(merge(props.query, { o: skip - 25 }))}" title="-25">‹</a></li>` : '<li class="subtitle">‹</li>'}
      <li>offset: ${skip}${props.count ? `/${props.count}` : ''}</li>
      <li><a href="${props.url.split('?')[0]}?${qs.stringify(merge(props.query, { o: skip + 25 }))}" title="+25">›</a></li>
      <li><a href="${props.url.split('?')[0]}?${qs.stringify(merge(props.query, { o: skip + 50 }))}" title="+50">»</a></li>
    </menu>
  `;
};

module.exports = { paginator };
