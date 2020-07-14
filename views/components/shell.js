const shell = (html, props = {}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Kemono</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/normalize.css@8.0.1/normalize.css">
      ${props.compatibility ? '<link rel="stylesheet" type="text/css" href="/css/compatibility.css">' : ''}
      ${props.compatibility ? '' : '<link rel="stylesheet" type="text/css" href="/css/index.css">'}
      ${props.discord ? '<link rel="stylesheet" type="text/css" href="/css/discord.css">' : ''}
      ${props.service ? `<meta name="service" content="${props.service}"/>` : ''}
      ${props.count ? `<meta name="count" content="${props.count}"/>` : ''}
    </head>
    <body>
      ${html}
    </body>
  </html>
`;

module.exports = { shell };
