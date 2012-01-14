var http = require('http');
var connect = require('connect');
var conf = require('./conf');
var everyauth = require('everyauth');
var httpProxy = require('http-proxy');

everyauth.github
  .appId(conf.github.appId)
  .appSecret(conf.github.appSecret)
  .findOrCreateUser( function (sess, accessToken, accessTokenExtra, ghUser) {
    var p = this.Promise();
    this.oauth.get(this.apiHost() + '/organizations', accessToken, function (err, data) {
      if (err) return p.fail(err);
      ghUser.organizations = JSON.parse(data).organizations;
      p.fulfill(ghUser);
    })
    return p;
  })
  .redirectPath('/');

var proxy = new (httpProxy.RoutingProxy)();

function doProxy(req, res, next) {
  proxy.proxyRequest(req, res, {
    host: 'localhost',
    port: 1081
  });
}

function userCanAccess(req) {
  if(req.url.match(/^\/auth\//)) { return true; }
  var auth = req.session.auth;
  if(!auth) {
    console.log("User rejected because they haven't authenticated.");
    return false;
  }

  for(var i = 0; i < auth.github.user.organizations.length; i++) {
    var organization = auth.github.user.organizations[i];
    if(organization.login == conf.github.requiredOrganization) { return true; }
  }

  console.log("User rejected because they aren't in the '" + conf.github.requiredOrganization + "' organization.");

  return false;
}

function checkUser(req, res, next) {
  if(userCanAccess(req)) {
    next();
  } else {
    res.writeHead(302, { 'Location': "/auth/github" });
    res.end();
  }
}

var connectSession = connect.session({secret: conf.secret, fingerprint: function(req) { return "default"; }})

var app = connect.createServer(
  connect.cookieParser(),
  connect.logger(),
  connectSession,
  everyauth.middleware(),
  checkUser,
  doProxy
);

app.on('upgrade', function(req, socket, head) {
  connect.cookieParser()(req, new http.ServerResponse(req), function() {});
  connectSession(req, new http.ServerResponse(req), function() {
    if(userCanAccess(req)) {
      proxy.proxyWebSocketRequest(req, socket, head, {
        host: 'localhost',
        port: 1081
      });
    } else {
      socket.end();
    }
  });
});

app.listen(3012);
