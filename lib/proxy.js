var httpProxy = require('http-proxy');
var conf = require('../conf');

var Proxy = module.exports = function(host, port) {
  this.host = host;
  this.port = port;
  this.proxy = new (httpProxy.RoutingProxy)();
};

Proxy.prototype.middleware = function() {
  var self = this;

  return function (req, res, next) {
    // need to set target host or we always get proxyTo's default vhost
    req.headers['host'] = conf.proxyTo.host;

    self.proxy.proxyRequest(req, res, {
      host: self.host,
      port: self.port
    });
  }
}

Proxy.prototype.proxyWebSocketRequest = function(req, socket, head) {
  this.proxy.proxyWebSocketRequest(req, socket, head, { host: this.host, port: this.port });
};
