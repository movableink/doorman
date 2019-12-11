const everyauth = require("everyauth");
const http = require("http");
const cookieParser = require("cookie-parser");
const session = require("cookie-session");
const Proxy = require("./proxy");
const oauthMiddleware = require("./oauth_middleware");
const log = require("./log");

const github = require("./modules/github");
const google = require("./modules/google");
const password = require("./modules/password");

class Domain {
  constructor(options) {
    if (!(this instanceof Domain)) {
      return new Domain(options);
    }
    this.options = options;
    this.oauthMiddleware = this.setupModules();
    this.proxy = new Proxy(
      options.proxyTo.host,
      options.proxyTo.port,
      options.proxyTo.ssl,
      options.proxyTo.ssl_insecure
    );
    this._proxyMiddleware = this.proxy.middleware();
    this.cookieMiddleware = cookieParser(options.sessionSecret);
    this.sessionMiddleware = session(this.sessionOptions());
  }
  setupModules() {
    this.enabled = {};
    // Set up our auth strategies
    if (this.options.modules.github) {
      this.enabled.github = github.setup(everyauth, this.options);
    }
    if (this.options.modules.google) {
      this.enabled.google = google.setup(everyauth, this.options);
    }
    if (this.options.modules.password) {
      this.enabled.password = password.setup(everyauth, this.options);
    }
    this.middleware = oauthMiddleware(this.enabled);
    return this.middleware;
  }
  userCanAccess(req) {
    let auth = req.session && req.session.auth;
    if (!auth) {
      log.info({
        action: "user rejected",
        reason: "unauthenticated",
        host: req.hostname
      });
      return false;
    }
    for (let authType in auth) {
      if (this.enabled[authType] && this.enabled[authType].authorize(auth)) {
        return true;
      }
    }
    return false;
  }
  proxyMiddleware(req, res, next) {
    // /_doorman requests never get proxied
    if (req.url.indexOf("/_doorman") == 0) {
      return next();
    }
    if (this.userCanAccess(req) || this.isPublicPath(req)) {
      this._proxyMiddleware(req, res, next);
    } else {
      if (req.session && req.session.auth) {
        // User had an auth, but it wasn't an acceptable one
        req.session.auth = null;
        log.info({
          action: "user rejected",
          reason: "account does not meet configured criteria",
          host: req.hostname
        });
        req.flash(
          "error",
          "Sorry, your account is not authorized to access the system."
        );
      }
      next();
    }
  }
  forceTLSMiddleware(req, res, next) {
    if (this.options.forceTLS && this.options.securePort && !req.secure) {
      var redirectPath = ["https://", req.hostname];
      redirectPath.push(req.url);
      return res.redirect(301, redirectPath.join(""));
    }
    next();
  }
  isPublicPath(req) {
    if (!this.options.publicPaths) {
      return false;
    }
    for (let i = 0, len = this.options.publicPaths.length; i < len; i++) {
      let path = this.options.publicPaths[i];
      if (typeof path == "object") {
        // regex
        if (req.url.match(path)) {
          return true;
        }
      } else {
        if (req.url.indexOf(path) == 0) {
          return true;
        }
      }
    }
    return false;
  }
  sessionOptions() {
    return (
      this.options.sessionCookie || {
        maxage: this.options.sessionCookieMaxAge,
        domain: this.options.sessionCookieDomain,
        secureProxy: this.options.sessionSecureProxy,
        secret: this.options.sessionSecret,
        name: "__doorman"
      }
    );
  }
  upgrade(req, socket, head) {
    let self = this;
    this.sessionMiddleware(req, new http.ServerResponse(req), function() {
      if (self.userCanAccess(req)) {
        self.proxy.proxyWebSocketRequest(req, socket, head);
      } else {
        socket.destroy();
      }
    });
  }
  static setDomain(domains) {
    return function(req, res, next) {
      let host = req.headers["host"];
      req.vdomain = domains[host] || domains["default"];
      if (req.vdomain) {
        next();
      } else {
        let cleanedDomain = host && host.replace(/[^A-Za-z0-9\-\.\:]/, "");
        res.writeHead(500, {});
        res.end(
          `Unrecognized domain ${cleanedDomain} and no default domain set`
        );
      }
    };
  }
}

module.exports = Domain;
