var everyauth = require('everyauth');
var ExpressRouter = require('everyauth/node_modules/express/lib/router');
var merge = require('everyauth/lib/utils').merge;


// Monkeypatching everyauth to create from specific oauth modules rather than
// just whatever modules it has currently

function addRequestLocals (req, res, userAlias) {
  if (res.locals) {
    var session = req.session;
    var auth = session && session.auth;
    var everyauthLocal = merge(auth, {
      loggedIn: !! (auth && auth.loggedIn)
      , user: req.user
    });

    if (everyauth.enabled.password) {
      // Add in access to loginFormFieldName() + passwordFormFieldName()
      everyauthLocal.password || (everyauthLocal.password = {});
      everyauthLocal.password.loginFormFieldName = everyauth.password.loginFormFieldName();
      everyauthLocal.password.passwordFormFieldName = everyauth.password.passwordFormFieldName();
    }
    res.locals.everyauth = everyauthLocal;
    res.locals[userAlias] = req.user;
  }
}

function registerReqGettersAndMethods (req) {
  var methods = everyauth._req._methods;
  var getters = everyauth._req._getters;
  for (var name in methods) {
    req[name] = methods[name];
  }
  for (name in getters) {
    Object.defineProperty(req, name, {
      get: getters[name]
    });
  }
}

function fetchUserFromSession (req, callback) {
  var session = req.session;
  var auth = session && session.auth;

  callback(auth && auth.userId);
}

// This looks suspiciously like everyauth.middleware() but takes a module list
module.exports = function(moduleList) {
  var router = new ExpressRouter();
  var userAlias = everyauth.expressHelperUserAlias || 'user';

  for(var i in moduleList) {
    var _module = moduleList[i];
    _module.validateSequences();
    _module.routeApp(router);
  }

  return function oauthMiddleware(req, res, next) {
    fetchUserFromSession(req, function(err) {
      addRequestLocals(req, res, userAlias);
      registerReqGettersAndMethods(req);
      if (router) {
        router._dispatch(req, res, next);
      } else {
        next();
      }
    });
  };
};
