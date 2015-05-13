var url = require('url');

var hasSession = function(auth) {
  return auth.loggedIn;
}

exports.setup = function(everyauth, config) {
  everyauth.password
    .getLoginPath("/_doorman/login")
    .postLoginPath("/_doorman/login")
    .loginView('password_login.jade')
    .loginSuccessRedirect('/')
    .authenticate(function(login, password) {
      if(config.modules.password.token && (config.modules.password.token == password)) {
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

  console.warn(config.domain + " registered password authentication.");
};
