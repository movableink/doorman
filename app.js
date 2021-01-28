const config = require("./lib/config");
const http = require("http");
const https = require("https");
const { constants } = require("crypto");
const express = require("express");
const bodyParser = require("body-parser");
const flash = require("express-flash");
const requestLogger = require("./middlewares/request_logger");
const setDomain = require("./middlewares/set_domain");
const letsencrypt = require("./middlewares/letsencrypt");
const log = require("./lib/log");
const passport = require("passport");
const ProxyDomain = require("./lib/proxy_domain");

const createDomains = () => {
  let domains = {};
  for (var domainName in config.domains) {
    var domainOptions = config.domains[domainName];

    var domain = new ProxyDomain(domainOptions);
    domains[domainName] = domain;
  }
  return domains;
};
const domains = createDomains();

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

const app = express();
const domainMiddleware = setDomain(domains);
app.set("view engine", "pug");
app.use("/", letsencrypt.middleware());
app.use(requestLogger);
app.use(express.static(__dirname + "/public", { maxAge: 0 }));
app.use(domainMiddleware);
app.use((req, res, next) => req.vdomain.tls(req, res, next));
app.use((req, res, next) => req.vdomain.cookies(req, res, next));
app.use((req, res, next) => req.vdomain.sessions(req, res, next));
app.use(passport.initialize());
app.use((req, res, next) => {
  if (req.url != "/favicon.ico") {
    passport.session()(req, res, next);
  } else {
    next();
  }
});
app.use(flash());
app.use((req, res, next) => req.vdomain.forward(req, res, next));
app.use(bodyParser.urlencoded({ extended: false }));
app.use((req, res, next) => req.vdomain.authenticate(req, res, next));
app.use(function loginPage(req, res) {
  if (req.url.indexOf("/_doorman/logout") == 0) {
    if (req && req.session) {
      req.session.passport = null;
    }
    res.redirect("/");
    return;
  }
  req.session.redirectTo = req.originalUrl;
  res.render("login.pug", { pageTitle: "Login", providers: req.vdomain.enabled });
});

app.use((err, req, res) => {
  req.flash("error", `The authentication method reports: ${err.message}`);
  res.redirect("/");
});

// Uncaught error states
app.on("error", function(err) {
  log.error({
    message: "Uncaught Error",
    error: err
  });
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

const httpsOptions = Object.assign(
  {
    secureOptions:
      constants.SSL_OP_NO_SSLv2 |
      constants.SSL_OP_NO_SSLv3 |
      constants.SSL_OP_NO_TLSv1 |
      constants.SSL_OP_NO_TLSv1_1
  },
  letsencrypt.httpsOptions
);
if (config.securePort) {
  let httpsServer = https.createServer(httpsOptions, app).listen(config.securePort, function() {
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
