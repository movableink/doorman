var httpProxy = require('http-proxy');

var Proxy = module.exports = function(host, port) {
  this.host = host;
  this.port = port;
  this.proxy = new (httpProxy.RoutingProxy)();
};

Proxy.prototype.middleware = function() {
  var self = this;

  return function (req, res, next) {
    self.proxy.proxyRequest(req, res, {
      host: self.host,
      port: self.port
    });
  }
}

Proxy.prototype.proxyWebSocketRequest = function(req, socket, head) {
  this.proxy.proxyWebSocketRequest(req, socket, head, { host: this.host, port: this.port });
};
