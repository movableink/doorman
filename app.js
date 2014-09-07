var http = require('http');
var express = require('express');
var connect = require('connect');
try { var conf = require('./conf'); } catch(e) {
  console.log("Missing conf.js.  Please copy conf.example.js to conf.js and edit it.");
  process.exit(1);
}
var everyauth = require('everyauth');
var Proxy = require('./lib/proxy');
var github = require('./lib/modules/github');
var google = require('./lib/modules/google');
var log = require('./lib/winston');

var proxy = new Proxy(conf.proxyTo.host, conf.proxyTo.port);
var proxyMiddleware = proxy.middleware();

// Set up our auth strategies
if (conf.modules.github) {
  github.setup(everyauth);
}
if (conf.modules.google) {
  google.setup(everyauth);
}

function userCanAccess(req) {
  var auth = req.session.auth;
  if(!auth) {
    log.debug("User rejected because they haven't authenticated.");
    return false;
  }

  for(var authType in req.session.auth) {
    if(everyauth[authType] && everyauth[authType].authorize(auth)) { return true; }
  }

  return false;
}

function checkUser(req, res, next) {
  if(userCanAccess(req)) {
    proxyMiddleware(req, res, next);
  } else {
    next();
  }
}

function loginPage(req, res, next) {
  if(req.query.error) {
    res.render('error.jade', { pageTitle: "An error occurred.", error: "The authentication method reports: " + req.query.error_description });
    return
  }

  req.session.redirectTo = req.originalUrl;
  req.session.save();
  res.render('login.jade', { pageTitle: 'Login', providers: everyauth.enabled });
}

// Store the middleware since we use it in the websocket proxy
var connectSession = connect.session({cookie: { maxAge: conf.sessionCookieMaxAge },
                                      secret: conf.sessionSecret,
                                      fingerprint: function(req) { return "default"; }});

var app = express.createServer(
  log.middleware(),
  connect.cookieParser(),
  connectSession,
  checkUser,
  everyauth.middleware(),
  connect.static(__dirname + "/public", {maxAge: 30 * 24 * 60 * 60 * 1000 * 0 }),
  loginPage
);

// WebSockets are also authenticated
app.on('upgrade', function(req, socket, head) {
  connect.cookieParser()(req, new http.ServerResponse(req), function() {});
  connectSession(req, new http.ServerResponse(req), function() {
    if(userCanAccess(req)) {
      proxy.proxyWebSocketRequest(req, socket, head);
    } else {
      socket.destroy();
    }
  });
});

// Uncaught error states
app.on('error', function(err) {
  console.log(err);
});

everyauth.everymodule.moduleErrback(function(err, data) {
  data.res.render('error.jade', { pageTitle: 'Sorry, there was an error.', error: "Perhaps something is misconfigured, or the provider is down." });
});

app.listen(conf.port);

log.notice("Doorman on duty, listening on port " + conf.port + " and proxying to " + conf.proxyTo.host + ":" + conf.proxyTo.port + ".");
