var config = require('./lib/config');
var http = require('http');
var https = require('https');
var express = require('express');
var bodyParser = require('body-parser');
var flash = require('express-flash');
var everyauth = require('everyauth');
var Domain = require('./lib/domain');
global.log = require('./lib/winston');

var domains = {};

for(var domainName in config.domains) {
  var domainOptions = config.domains[domainName];

  var domain = new Domain(domainOptions);
  domains[domainName] = domain;
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
  res.render('login.jade', { pageTitle: 'Login', providers: req.vdomain.enabled });
}

var app = express();

function proxyMiddleware(req, res, next) {
  req.vdomain.proxyMiddleware(req, res, next);
}

function oauthMiddleware(req, res, next) {
  req.vdomain.oauthMiddleware(req, res, next);
}

function cookieMiddleware(req, res, next) {
  req.vdomain.cookieMiddleware(req, res, next);
}

function sessionMiddleware(req, res, next) {
  req.vdomain.sessionMiddleware(req, res, next);
}

app.use(log.middleware());
app.use(Domain.setDomain(domains));
app.use(cookieMiddleware);
app.use(sessionMiddleware);
app.use(flash());
app.use(proxyMiddleware);
app.use(bodyParser.urlencoded({extended: false}));
app.use(oauthMiddleware);
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
  req.vdomain.upgrade(req, socket, head);
});

server.listen(config.port);

log.notice("Doorman on duty, listening on port " + config.port + ".");
for(var d in domains) {
  var domain = domains[d];
  log.notice("Proxying domain " + domain.options.domain + " to " + domain.options.proxyTo.host + ":" + domain.options.proxyTo.port + ".");
}
