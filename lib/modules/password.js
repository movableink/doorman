var conf = require('../../conf');
var url = require('url');
var log = require('../winston');

var hasSession = function(auth) {
  return auth.loggedIn;
}

exports.setup = function(everyauth) {
  everyauth.password
    .getLoginPath("/login")
    .postLoginPath("/login")
    .loginView('password_login.jade')
    .loginSuccessRedirect('/')
    .authenticate(function(login, password) {
      if(conf.modules.password.token && (conf.modules.password.token == password)) {
        return {authenticated: true};
      } else {
        return ['Password did not match'];
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

  everyauth.password._entryPath = "/login";
  everyauth.password.title = "Password";
  everyauth.password.authorize = hasSession;

  log.notice("Registered password authentication.");
};
