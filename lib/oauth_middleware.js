const everyauth = require("everyauth");
const ExpressRouter = require("everyauth/node_modules/express/lib/router");
const merge = require("everyauth/lib/utils").merge;

// Monkeypatching everyauth to create from specific oauth modules rather than
// just whatever modules it has currently

function addRequestLocals(req, res, userAlias) {
  if (res.locals) {
    let session = req.session;
    let auth = session && session.auth;
    let everyauthLocal = merge(auth, {
      loggedIn: !!(auth && auth.loggedIn),
      user: req.user
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

function registerReqGettersAndMethods(req) {
  let methods = everyauth._req._methods;
  let getters = everyauth._req._getters;
  for (let name in methods) {
    req[name] = methods[name];
  }
  for (let name in getters) {
    Object.defineProperty(req, name, {
      get: getters[name]
    });
  }
}

function fetchUserFromSession(req, callback) {
  let session = req.session;
  let auth = session && session.auth;

  callback(auth && auth.userId);
}

// This looks suspiciously like everyauth.middleware() but takes a module list
module.exports = function(moduleList) {
  let router = new ExpressRouter();
  let userAlias = everyauth.expressHelperUserAlias || "user";

  for (let i in moduleList) {
    let _module = moduleList[i];
    _module.validateSequences();
    _module.routeApp(router);
  }

  return function oauthMiddleware(req, res, next) {
    fetchUserFromSession(req, function() {
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
