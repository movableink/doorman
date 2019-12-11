const cloneModule = require("../clone_module");
const log = require("../log");

const hasSession = function(auth) {
  return auth.loggedIn;
};

exports.setup = function(everyauth, config) {
  let password = cloneModule("password");
  password
    .getLoginPath("/_doorman/login")
    .postLoginPath("/_doorman/login")
    .loginView("password_login.jade")
    .loginSuccessRedirect("/")
    .authenticate(function(login, pass) {
      if (config.modules.password.token && config.modules.password.token == pass) {
        return { authenticated: true };
      } else {
        return ["Sorry, the password was not correct."];
      }
    })
    .addToSession(function(sess, user) {
      let _auth = sess.auth || (sess.auth = {});
      if (user) {
        _auth.password = { loggedIn: true };
      }
      _auth.loggedIn = !!user;
    })
    // unused, as we don't allow registrations
    .registerUser(function() {})
    .getRegisterPath("/register")
    .postRegisterPath("/register");

  password._entryPath = "/_doorman/login";
  password.title = "Password";
  password.authorize = hasSession;

  log.warn({
    module: "Password",
    message: "Registered password authentication",
    domain: config.domain
  });

  return password;
};
