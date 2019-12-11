const httpProxy = require("http-proxy");
const log = require("./log");

class Proxy {
  constructor(host, port, ssl, insecure) {
    this.host = host;
    this.port = port;
    this.protocol = port == 443 ? "https://" : "http://";
    if (ssl) {
      this.protocol = "https://";
    }
    if (insecure) {
      this.secure = false;
    }

    this.target = `${this.protocol}${this.host}:${this.port}`;
    this.proxy = httpProxy.createProxyServer({
      xfwd: true,
      secure: this.secure
    });
  }
  middleware() {
    let self = this;

    return function(req, res, next) {
      log.info({ proxy: { target: self.target } });
      self.proxy.web(req, res, { target: self.target }, function(err) {
        if (err) {
          log.error({
            proxy: { error: { type: "backend", message: err.message } }
          });
          if (req.session) {
            req.session.flash = null;
          }
          req.flash("error", "There was an error with the backend service.");
          next();
        }
      });
    };
  }

  proxyWebSocketRequest(req, socket, head) {
    this.proxy.ws(req, socket, head, { target: this.target });
  }
}

module.exports = Proxy;
