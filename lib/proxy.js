var httpProxy = require('http-proxy');
var conf = require('../conf');



var Proxy = module.exports = function(host, port) {
  this.host = host;
  this.port = port;
  this.target = "http://" + this.host + ":" + this.port;
  this.proxy = httpProxy.createProxyServer({});
};

Proxy.prototype.middleware = function() {
  var self = this;

  return function (req, res, next) {
    // need to set target host or we always get proxyTo's default vhost
    req.headers['host'] = conf.proxyTo.host;

    self.proxy.web(req, res, {
      target: self.target
    });
  }
}

Proxy.prototype.proxyWebSocketRequest = function(req, socket, head) {
  this.proxy.ws(req,
                socket,
                head,
                { target: this.target });
};
