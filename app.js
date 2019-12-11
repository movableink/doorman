const config = require("./lib/config");
const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const bodyParser = require("body-parser");
const flash = require("express-flash");
const everyauth = require("everyauth");
const Domain = require("./lib/domain");
const requestLogger = require("./middlewares/request_logger");
const letsencrypt = require("./middlewares/letsencrypt");
const constants = require("constants");
const log = require("./lib/log");

let domains = {};

for (let domainName in config.domains) {
  let domainOptions = config.domains[domainName];

  let domain = new Domain(domainOptions);
  domains[domainName] = domain;
}

function loginPage(req, res, next) {
  if (req.url.indexOf("/_doorman/logout") == 0) {
    if (req && req.session) {
      req.session.auth = null;
    }
    res.redirect("/");
    return;
  }

  if (req.query.error) {
    req.flash(
      "error",
      `The authentication method reports: ${req.query.error_description}`
    );
  }

  req.session.redirectTo = req.originalUrl;
  res.render("login.jade", {
    pageTitle: "Login",
    providers: req.vdomain.enabled
  });
}

let app = express();

function forceTLSMiddleware(req, res, next) {
  req.vdomain.forceTLSMiddleware(req, res, next);
}

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

const domainMiddleware = Domain.setDomain(domains);

app.use("/", letsencrypt.middleware());
app.use(requestLogger);
app.use(domainMiddleware);
app.use(forceTLSMiddleware);
app.use(cookieMiddleware);
app.use(sessionMiddleware);
app.use(flash());
app.use(proxyMiddleware);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(oauthMiddleware);
app.use(express.static(__dirname + "/public", { maxAge: 0 }));
app.use(loginPage);

// Uncaught error states
app.on("error", function(err) {
  log.error({
    message: "Uncaught Error",
    error: err
  });
});

everyauth.everymodule.moduleErrback(function(err, data) {
  data.req.flash(
    "error",
    "Perhaps something is misconfigured, or the provider is down."
  );
  data.res.redirectTo("/");
});

// We don't actually use this
everyauth.everymodule.findUserById(function(userId, callback) {
  callback(userId);
});

function upgradeWebsocket(server) {
  // WebSockets are also authenticated
  server.on("upgrade", function(req, socket, head) {
    domainMiddleware(req, null, function() {
      req.vdomain.upgrade(req, socket, head);
    });
  });
}

let httpServer = http.createServer(app).listen(config.port, function() {
  log.warn({
    message: "Doorman on duty",
    protocol: "http",
    port: config.port
  });
});
upgradeWebsocket(httpServer);

if (config.securePort) {
  let httpsServer = https
    .createServer(letsencrypt.httpsOptions, app)
    .listen(config.securePort, function() {
      log.warn({
        message: "Listening on secure port",
        protocol: "https",
        port: config.securePort
      });
    });
  upgradeWebsocket(httpsServer);
}

for (let d in domains) {
  let domain = domains[d];
  log.warn({
    message: "Proxying domain",
    domain: domain.options.domain,
    proxyTo: domain.options.proxyTo
  });
}
