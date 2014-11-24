try { var conf = require('./conf'); } catch(e) {
  console.log("Missing conf.js.  Please copy conf.example.js to conf.js and edit it.");
  process.exit(1);
}

var http = require('http');
var https = require('https');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var cookieParser = require('cookie-parser');
var flash = require('express-flash');
var everyauth = require('everyauth');
var Proxy = require('./lib/proxy');
var github = require('./lib/modules/github');
var google = require('./lib/modules/google');
var password = require('./lib/modules/password');
global.log = require('./lib/winston');

var proxy = new Proxy(conf.proxyTo.host, conf.proxyTo.port);
var proxyMiddleware = proxy.middleware();

// Set up our auth strategies
if (conf.modules.github) {
  github.setup(everyauth);
}
if (conf.modules.google) {
  google.setup(everyauth);
}
if(conf.modules.password) {
  password.setup(everyauth);
}

function userCanAccess(req) {
  var auth = req.session && req.session.auth;
  if(!auth) {
    log.debug("User rejected because they haven't authenticated.");
    return false;
  }

  for(var authType in auth) {
    if(everyauth[authType] && everyauth[authType].authorize(auth)) {
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
  if(userCanAccess(req) || isPublicPath(req)) {
    proxyMiddleware(req, res, next);
  } else {
    if(req.session && req.session.auth) {
      // User had an auth, but it wasn't an acceptable one
      req.session.auth = null;
      log.debug("User successfully oauthed but their account does not meet the configured criteria.");

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
    res.render('error.jade', { pageTitle: "An error occurred.", error: "The authentication method reports: " + req.query.error_description });
    return;
  }

  req.session.redirectTo = req.originalUrl;
  res.render('login.jade', { pageTitle: 'Login', providers: everyauth.enabled });
}

// Store the middleware since we use it in the websocket proxy
var sessionOptions = {
  maxage: conf.sessionCookieMaxAge,
  domain: conf.sessionCookieDomain,
  secureProxy: conf.sessionSecureProxy,
  secret: conf.sessionSecret,
  name: '__doorman',
};
var doormanSession = session(sessionOptions);

var app = express();

app.use(log.middleware());
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
  console.log(err);
});

everyauth.everymodule.moduleErrback(function(err, data) {
  data.res.render('error.jade', { pageTitle: 'Sorry, there was an error.', error: "Perhaps something is misconfigured, or the provider is down." });
});

// We don't actually use this
everyauth.everymodule.findUserById(function(userId, callback) { callback(userId); })

var server = http.createServer(app);

// WebSockets are also authenticated
server.on('upgrade', function(req, socket, head) {
  doormanSession(req, new http.ServerResponse(req), function() {
    if(userCanAccess(req)) {
      proxy.proxyWebSocketRequest(req, socket, head);
    } else {
      socket.destroy();
    }
  });
});

server.listen(conf.port);

log.notice("Doorman on duty, listening on port " + conf.port + " and proxying to " + conf.proxyTo.host + ":" + conf.proxyTo.port + ".");
