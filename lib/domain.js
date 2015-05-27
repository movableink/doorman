var everyauth = require('everyauth');
var http = require('http');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var Proxy = require('./proxy');
var oauthMiddleware = require('./oauth_middleware');

var github = require('./modules/github');
var google = require('./modules/google');
var password = require('./modules/password');

function Domain(options) {
  if (!(this instanceof Domain)) { return new Domain(options); }

  this.options = options;

  this.oauthMiddleware = this.setupModules();

  this.proxy = new Proxy(options.proxyTo.host,
                         options.proxyTo.port,
                         options.proxyTo.ssl,
                         options.proxyTo.insecure);
  this._proxyMiddleware = this.proxy.middleware();

  this.cookieMiddleware = cookieParser(options.sessionSecret);

  this.sessionMiddleware = session(this.sessionOptions());
};

Domain.prototype.setupModules = function() {
  this.enabled = {};

  // Set up our auth strategies
  if (this.options.modules.github) {
    this.enabled.github = github.setup(everyauth, this.options);
  }
  if (this.options.modules.google) {
    this.enabled.google = google.setup(everyauth, this.options);
  }
  if(this.options.modules.password) {
    this.enabled.password = password.setup(everyauth, this.options);
  }

  this.middleware = oauthMiddleware(this.enabled);

  return this.middleware;
};

Domain.prototype.userCanAccess = function(req) {
  var auth = req.session && req.session.auth;
  if(!auth) {
    console.log("User rejected because they haven't authenticated.");
    return false;
  }

  for(var authType in auth) {
    if(this.enabled[authType] && this.enabled[authType].authorize(auth)) {
      return true;
    }
  }

  return false;
}

Domain.prototype.proxyMiddleware = function(req, res, next) {
  // /_doorman requests never get proxied
  if(req.url.indexOf('/_doorman') == 0) { return next(); }

  if(this.userCanAccess(req) || this.isPublicPath(req)) {
    this._proxyMiddleware(req, res, next);
  } else {
    if(req.session && req.session.auth) {
      // User had an auth, but it wasn't an acceptable one
      req.session.auth = null;
      console.log("User successfully oauthed but their account does not meet the configured criteria.");

      req.flash('error', "Sorry, your account is not authorized to access the system.");
    }
    next();
  }
}

Domain.prototype.forceTLSMiddleware = function(req, res, next) {
  if (this.options.forceTLS && config.securePort && !req.secure) {
    var redirectPath = ['https://', req.hostname];

    if (config.securePort != 443) {
      redirectPath.push(':');
      redirectPath.push(config.securePort);
    }

    redirectPath.push(req.url);

    return res.redirect(301, redirectPath.join(''));
  }
  next();
}

Domain.prototype.isPublicPath = function(req) {
  if(!this.options.publicPaths) { return false; }

  for(var i = 0, len = this.options.publicPaths.length; i < len; i++) {
    var path = this.options.publicPaths[i];
    if(typeof(path) == 'object') { // regex
      if(req.url.match(path)) { return true; }
    } else {
      if(req.url.indexOf(path) == 0) { return true; }
    }
  }

  return false;
}

Domain.prototype.sessionOptions = function() {
  return this.options.sessionCookie || {
    maxage: this.options.sessionCookieMaxAge,
    domain: this.options.sessionCookieDomain,
    secureProxy: this.options.sessionSecureProxy,
    secret: this.options.sessionSecret,
    name: '__doorman',
  };
}

Domain.prototype.upgrade = function(req, socket, head) {
  var self = this;

  this.sessionMiddleware(req, new http.ServerResponse(req), function() {
    if(self.userCanAccess(req)) {
      self.proxy.proxyWebSocketRequest(req, socket, head);
    } else {
      socket.destroy();
    }
  });
}

Domain.setDomain = function(domains) {
  return function(req, res, next) {
    var host = req.headers['host'];
    req.vdomain = domains[host] || domains['default'];

    if(req.vdomain) {
      next();
    } else {
      var cleanedDomain = host.replace(/[^A-Za-z0-9\-\.\:]/, '');
      res.writeHead(500, {});
      res.end("Unrecognized domain " + cleanedDomain + " and no default domain set");
    }
  };
};

module.exports = Domain;
