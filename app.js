var config      = require('./lib/config');
var fs          = require('fs');
var http        = require('http');
var https       = require('https');
var express     = require('express');
var bodyParser  = require('body-parser');
var flash       = require('express-flash');
var log         = require('./middlewares/log');
var letsencrypt = require('./middlewares/letsencrypt');
var passport    = require('passport');
var setDomain   = require('./middlewares/setDomain');
var ProxyDomain = require('./lib/proxy-domain');

const createDomains = () => {
  let domains = {}
  for(var domainName in config.domains) {
    var domainOptions = config.domains[domainName];

    var domain = new ProxyDomain(domainOptions);
    domains[domainName] = domain;
  }
  return domains
}
const domains = createDomains();

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

const app = express();
app.set('view engine', 'pug')
app.use(log);
app.use(express.static(__dirname + "/public", { maxAge: 0 }));
app.use(setDomain(domains));
app.use((req, res, next) => req.vdomain.tls(req, res, next));
app.use((req, res, next) => req.vdomain.cookies(req, res, next));
app.use((req, res, next) => req.vdomain.sessions(req, res, next));
app.use(passport.initialize());
app.use((req, res, next) => {
  if (req.url != '/favicon.ico') {
    passport.session()(req, res, next);
  } else {
    next();
  }
});
app.use(flash());
app.use((req, res, next) => req.vdomain.forward(req, res, next));
app.use(bodyParser.urlencoded({ extended: false }));
app.use((req, res, next) => req.vdomain.authenticate(req, res, next));
app.use(function loginPage(req, res, next) {
  if (req.url.indexOf("/_doorman/logout") == 0) {
    if (req && req.session) { req.session.passport = null; }
    console.log('redirect 1')
    res.redirect("/");
    return;
  }
  req.session.redirectTo = req.originalUrl;
  res.render('login.pug', { pageTitle: 'Login', providers: req.vdomain.enabled });
});

app.use((err, req, res, next) => {
  req.flash('error', `The authentication method reports: ${err.message}`)
  console.log('redirect 2', err)
  res.redirect('/')
})

// Uncaught error states
app.on('error', function(err) {
  console.error(err);
});

function upgradeWebsocket(server) {
  // WebSockets are also authenticated
  server.on('upgrade', function(req, socket, head) {
    domainMiddleware(req, null, function() {
      req.vdomain.upgrade(req, socket, head);
    });
  });
}

var httpServer = http.createServer(letsencrypt.middleware(app)).listen(config.port, function() {
  console.warn("Doorman on duty, listening on port " + config.port + ".");
});
upgradeWebsocket(httpServer);

if(config.securePort) {
  var httpsServer = https.createServer(letsencrypt.httpsOptions, letsencrypt.middleware(app)).listen(config.securePort, function() {
    console.warn("                 listening on secure port " + config.securePort + ".");
  });
  upgradeWebsocket(httpsServer);
}

for(var d in domains) {
  var domain = domains[d];
  console.warn("Proxying domain " + domain.options.domain + " to " + domain.options.proxyTo.host + ":" + domain.options.proxyTo.port + ".");
}
