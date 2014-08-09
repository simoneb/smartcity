var httpProxy = require('http-proxy'),
    url = require('url'),
    http = require('http'),
    validServers = {};

var proxy = httpProxy.createProxyServer({});

http.createServer(function (req, res) {
  var targetUrl = req.headers['x-teamcity'],
      targetHost = validServers[targetUrl];

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Headers': 'accept, authorization, content-type, x-teamcity',
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end();
  }

  req.headers.host = targetHost;

  if (targetHost === false) {
    console.log('prevented access to invalid teamcity server', targetUrl);
    return res.end();
  }

  if (targetHost) {
    return  proxy.web(req, res, { target: targetUrl });
  }

  console.log('validating', targetUrl);

  var parsedTarget = url.parse(targetUrl);
  targetHost = parsedTarget.host;

  http.get({
    hostname: targetHost,
    port: parsedTarget.port,
    path: '/httpAuth/app/rest/',
    headers: req.headers
  }, function (validationRes) {
    if (validationRes.statusCode === 404) {
      console.log(targetUrl, 'is not a valid teamcity server');

      validServers[targetUrl] = false;
      return res.end();
    }

    console.log(targetUrl, 'is a valid teamcity server');

    validServers[targetUrl] = targetHost;

    proxy.web(req, res, { target: targetUrl });
  });
}).listen(process.env.PORT || 3000);

proxy.on('proxyRes', function (res) {
  res.headers['Access-Control-Allow-Origin'] = '*';
});

