var conf = require('./lib/config');

var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var cookieParser = require('cookie-parser');
var flash = require('express-flash');
var everyauth = require('everyauth');
var Proxy = require('./lib/proxy');
var tls = require('./middlewares/tls');
log = require('./lib/log');

var proxy = new Proxy(conf.proxyTo.host, conf.proxyTo.port);
var proxyMiddleware = proxy.middleware();

// Set up our auth strategies
if (conf.modules.github) {
  var github = require('./lib/modules/github');
  github.setup(everyauth);
}
if (conf.modules.google) {
  var google = require('./lib/modules/google');
  google.setup(everyauth);
}
if(conf.modules.password) {
  var password = require('./lib/modules/password');
  password.setup(everyauth);
}

function userCanAccess(req) {
  var auth = req.session && req.session.auth;
  if(!auth) {
    log.info("User rejected because they haven't authenticated.");
    return false;
  }

  for(var authType in auth) {
    if(everyauth[authType] && everyauth[authType].authorize(auth)) {
      everyauth[authType].decorate(req, auth);
      return true;
    }
  }

  return false;
}

function isPublicPath(req) {
  if(!conf.publicPaths) { return false; }

  for(var i = 0, len = conf.publicPaths.length; i < len; i++) {
    var path = conf.publicPaths[i];
    if(typeof(path) == 'object') { // regex
      if(req.url.match(path)) { return true; }
    } else {
      if(req.url.indexOf(path) == 0) { return true; }
    }
  }

  return false;
}

function checkUser(req, res, next) {
  // /_doorman requests never get proxied
  if(req.url.indexOf('/_doorman') == 0) { return next(); }

  if(userCanAccess(req) || isPublicPath(req)) {
    proxyMiddleware(req, res, next);
  } else {
    if(req.session && req.session.auth) {
      // User had an auth, but it wasn't an acceptable one
      req.session.auth = null;
      log.info("User successfully oauthed but their account does not meet the configured criteria.");

      req.flash('error', "Sorry, your account is not authorized to access the system.");
    }
    next();
  }
}

function loginPage(req, res, next) {
  if(req.url.indexOf("/_doorman/logout") == 0) {
    if(req && req.session) { req.session.auth = null; }
    res.redirect("/");
    return;
  }

  if(req.query.error) {
    req.flash('error', "The authentication method reports: " + req.query.error_description);
  }

  req.session.redirectTo = req.originalUrl;
  res.render('login.jade', { pageTitle: 'Login', providers: everyauth.enabled });
}

// Store the middleware since we use it in the websocket proxy
var sessionOptions = conf.sessionCookie || {
  maxage: conf.sessionCookieMaxAge,
  domain: conf.sessionCookieDomain,
  secureProxy: conf.sessionSecureProxy,
  secret: conf.sessionSecret,
  name: '__doorman',
};
var doormanSession = session(sessionOptions);

var logMiddleware = function(req, res, next) {
  log.info([req.method, req.headers.host, req.url].join(' '));
  next();
};

var app = express();

app.use(logMiddleware);
app.use(tls);
app.use(cookieParser(conf.sessionSecret));
app.use(doormanSession);
app.use(flash());
app.use(checkUser);
app.use(bodyParser.urlencoded({extended: false}));
app.use(everyauth.middleware());
app.use(express.static(__dirname + "/public", {maxAge: 0 }));
app.use(loginPage);

// Uncaught error states
app.on('error', function(err) {
  log.error(err);
});

everyauth.everymodule.moduleErrback(function(err, data) {
  data.req.flash('error', "Perhaps something is misconfigured, or the provider is down.");
  data.res.redirectTo('/');
});

// We don't actually use this
everyauth.everymodule.findUserById(function(userId, callback) { callback(userId); });

// WebSockets are also authenticated
function upgradeWebsocket(server) {
  server.on('upgrade', function(req, socket, head) {
    doormanSession(req, new http.ServerResponse(req), function() {
      if(userCanAccess(req)) {
        proxy.proxyWebSocketRequest(req, socket, head);
      } else {
        socket.destroy();
      }
    });
  });
}

var notice = "Doorman on duty,";

var httpServer = http.createServer(app);

// Enable HTTPS if SSL options exist
if (conf.securePort && conf.ssl && conf.ssl.keyFile && conf.ssl.certFile) {
  var options = {
    key: fs.readFileSync(conf.ssl.keyFile),
    cert: fs.readFileSync(conf.ssl.certFile)
  };

  if (conf.ssl.caFile) options.ca = fs.readFileSync(conf.ssl.caFile);

  var httpsServer = https.createServer(options, app);

  upgradeWebsocket(httpsServer);
  httpsServer.listen(conf.securePort);

  notice += " listening on secure port " + conf.securePort;
}
notice += " listening on port " + conf.port;
notice += " and proxying to " + conf.proxyTo.host + ":" + conf.proxyTo.port + ".";

upgradeWebsocket(httpServer);
httpServer.listen(conf.port);

log.error(notice);
