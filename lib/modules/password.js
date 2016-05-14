var conf = require('../config');
var url = require('url');
var log = require('../log');

var hasSession = function(auth) {
  return auth.loggedIn;
}

exports.setup = function(everyauth) {
  everyauth.password
    .getLoginPath("/_doorman/login")
    .postLoginPath("/_doorman/login")
    .loginView('password_login.jade')
    .loginSuccessRedirect('/')
    .authenticate(function(login, password) {
      if(conf.modules.password.token && (conf.modules.password.token == password)) {
        return {authenticated: true};
      } else {
        return ['Sorry, the password was not correct.'];
      };
    })
    .addToSession(function(sess, user, errors) {
      var _auth = sess.auth || (sess.auth = {});
      if (user) {
        _auth.password = {loggedIn: true};
      }
      _auth.loggedIn = !!user;
    })
    // unused, as we don't allow registrations
    .registerUser(function() {})
    .getRegisterPath("/register")
    .postRegisterPath("/register");

  everyauth.password._entryPath = "/_doorman/login";
  everyauth.password.title = "Password";
  everyauth.password.authorize = hasSession;
  everyauth.password.decorate = function(req, auth) {
    req.username = 'user';
  };

  log.warn("Registered password authentication.");
};
