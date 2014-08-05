var httpProxy = require('http-proxy'),
    url = require('url');
    http = require('http');

var server = process.env.TEAMCITY_URL;

var proxy = httpProxy.createProxyServer({
  target: server
});

http.createServer(function (req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Headers': 'accept, authorization, content-type',
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
  });
    res.end();
  } else {
    req.headers.host = url.parse(server).host;
    proxy.web(req, res);
  }
}).listen(process.env.PORT || 3000);

proxy.on('proxyRes', function (res) {
  res.headers['Access-Control-Allow-Headers'] = 'accept, authorization';
  res.headers['Access-Control-Allow-Methods'] = 'GET,HEAD,PUT,PATCH,POST,DELETE';
  res.headers['Access-Control-Allow-Origin'] = '*';
});

