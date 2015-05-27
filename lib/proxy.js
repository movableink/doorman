var httpProxy = require('http-proxy');

var Proxy = module.exports = function(host, port, ssl, insecure) {
  this.host = host;
  this.port = port;
  this.protocol = (port == 443) ? 'https://' : 'http://';
  if(ssl) { this.protocol = 'https://'; }
  if(insecure) { this.secure = false; }

  this.target = this.protocol + this.host + ":" + this.port;
  this.proxy = httpProxy.createProxyServer({xfwd: true, secure: this.secure});
};

Proxy.prototype.middleware = function() {
  var self = this;

  return function (req, res, next) {
    console.log("Proxying to " + self.target);
    self.proxy.web(req, res, {target: self.target}, function(err) {
      if(err) {
        console.error("Backend error: " + err.message);
        if(req.session) { req.session.flash = null; }
        req.flash('error', 'There was an error with the backend service.');
        next();
      }
    });
  };
};

Proxy.prototype.proxyWebSocketRequest = function(req, socket, head) {
  this.proxy.ws(req, socket, head, { target: this.target });
};
