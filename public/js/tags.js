(function () {
  var service = document.getElementsByName('service')[0] ? document.getElementsByName('service')[0].content : '';
  var user = document.getElementsByName('user')[0] ? document.getElementsByName('user')[0].content : '';
  var count = document.getElementsByName('count')[0] ? document.getElementsByName('count')[0].content : '';
  if (!service || !user) return;

  const extraInfo = document.getElementById('additional-info');
  switch (service) {
    case 'patreon': {
      extraInfo.innerHTML += '<h5>User Information</h5>';
      fetch('/proxy/user/' + user)
        .then(function (res) { return res.json(); })
        .then(function (info) {
          extraInfo.innerHTML += `
            <li>
              CUF Enabled: ${info.included[0].attributes.is_charge_upfront ? 'Yes' : '<span style="color: #0f0">No</span>'}
            </li>
            <li>
              ${info.included[0].attributes.creation_count > Number(count) ? `
                <span style="color:#cc0">Missing ${info.included[0].attributes.creation_count - Number(count)} posts</span>
              ` : '<span style="color:#0f0">Up to date</span>'}
            </li>
          `;
        });
    }
  }
})();
