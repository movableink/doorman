var conf = require('../config');
var url = require('url');
var log = require('../log');

if(conf.modules.google) {
  var requiredDomain = conf.modules.google.requiredDomain;
  if(requiredDomain && !requiredDomain.push) { requiredDomain = [requiredDomain]; }

  var requiredEmail = conf.modules.google.requiredEmail;
  if(requiredEmail && !requiredEmail.push) { requiredEmail = [requiredEmail]; }

  if(!requiredEmail && !requiredDomain) {
    log.error("Config must specify either requiredEmail or requiredDomain.");
    process.exit(1);
  }
}

var checkDomain = function(auth) {
  var email = auth.google.user.email.split('@');

  for(var i = 0; i < requiredDomain.length; i++) {
    if(email.length == 2 && email[1] == requiredDomain[i]) {
      return true;
    }
  }

  log.info("User rejected because " + email + " isn't in the domain list: " + requiredDomain.join(", "));

  return false;
};

var checkEmail = function(auth) {
  var email = auth.google.user.email
  if(requiredEmail.indexOf(email) >= 0) {
    return true;
  }

  log.info("User rejected because " + email + "isn't in the list of allowed email addresses.");

  return false;
};

exports.setup = function(everyauth) {
  everyauth.google
    .myHostname(conf.hostname)
    .appId(conf.modules.google.appId)
    .appSecret(conf.modules.google.appSecret)
    .scope('https://www.googleapis.com/auth/userinfo.email')
    .authQueryParam({ access_type:'online', approval_prompt:'auto' })
    .findOrCreateUser( function (sess, accessToken, accessTokenExtra, googleUser) {
      return googleUser;
    })
    .handleAuthCallbackError( function (req, res) {
      var parsedUrl = url.parse(req.url, true);
      req.flash('error', 'Error authenticating with Google: ' + parsedUrl.query.error);
      res.redirectTo('/');
    })
    .convertErr( function (data) {
      if(data.data) {
        return new Error(data.data.match(/H1>(.+)<\/H1/)[1]);
      } else if(data.error && data.error.message) {
        return new Error(data.error.message, data.error);
      } else {
        return new Error(JSON.stringify(data));
      }
    })
    .redirectPath('/');

  if(requiredDomain) { everyauth.google.authQueryParam({ hd: requiredDomain}); }

  everyauth.google.authorize = function(auth) {
    if(requiredEmail) { if(!checkEmail(auth)) { return false; }; }
    if(requiredDomain) { if(!checkDomain(auth)) { return false }; }

    return true;
  };
  everyauth.google.decorate = function(req, auth) {
    req.username = auth.google.user.email;
  };
  everyauth.google.title = "Google";

  if(requiredDomain) {
    log.warn("Registered Google authentication for members of domains: " + requiredDomain.join(", "));
  }
  if(requiredEmail) {
    log.warn("Registered Google authentication for users: " + requiredEmail.join(", "));
  }
};
