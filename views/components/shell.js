const shell = (html, props = {}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Kemono</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/normalize.css@8.0.1/normalize.css">
      ${props.compatibility ? '<link rel="stylesheet" type="text/css" href="/css/compatibility.css">' : '<link rel="stylesheet" type="text/css" href="/css/index.css">'}
      ${props.discord ? '<link rel="stylesheet" type="text/css" href="/css/discord.css">' : ''}
      ${props.service ? `<meta name="service" content="${props.service}"/>` : ''}
      ${props.count ? `<meta name="count" content="${props.count}"/>` : ''}
      ${props.posts && props.posts.length > 0 ? `
        <meta name="published" content="${props.posts[0].published}"/>
        <meta name="added" content="${props.posts[0].added}"/>
        <meta name="id" content="${props.posts[0].id}"/>
      ` : ''}
    </head>
    <body>
      ${html}
    </body>
  </html>
`;

module.exports = { shell };
