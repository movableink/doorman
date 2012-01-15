var http = require('http');
var connect = require('connect');
var conf = require('./conf');
var everyauth = require('everyauth');
var Proxy = require('./lib/proxy');
var github = require('./lib/modules/github');

var proxy = new Proxy(conf.proxyTo.host, conf.proxyTo.port);

github.setup(everyauth);

function userCanAccess(req) {
  if(req.url.match(/^\/auth\//)) { return true; }
  var auth = req.session.auth;
  if(!auth) {
    console.log("User rejected because they haven't authenticated.");
    return false;
  }

  if(github.auth(auth)) { return true; }

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

// Store the middleware since we use it in the websocket proxy
var connectSession = connect.session({secret: conf.sessionSecret,
                                      fingerprint: function(req) { return "default"; }});

var app = connect(
  connect.cookieParser(),
  connect.logger(),
  connectSession,
  everyauth.middleware(),
  checkUser,
  proxy.middleware()
);

app.on('upgrade', function(req, socket, head) {
  connect.cookieParser()(req, new http.ServerResponse(req), function() {});
  connectSession(req, new http.ServerResponse(req), function() {
    if(userCanAccess(req)) {
      proxy.proxyWebSocketRequest(req, socket, head);
    } else {
      socket.end();
    }
  });
});

app.listen(conf.port);
