var url = require('url');

exports.setup = function(everyauth, config) {
  if(config.modules.google) {
    var requiredDomain = config.modules.google.requiredDomain;
    if(requiredDomain && !requiredDomain.push) { requiredDomain = [requiredDomain]; }

    var requiredEmail = config.modules.google.requiredEmail;
    if(requiredEmail && !requiredEmail.push) { requiredEmail = [requiredEmail]; }

    if(!requiredEmail && !requiredDomain) {
      console.error("Config must specify either requiredEmail or requiredDomain.");
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

    console.log("User rejected because " + email + " isn't in the domain list: " + requiredDomain.join(", "));

    return false;
  };

  var checkEmail = function(auth) {
    var email = auth.google.user.email
    if(requiredEmail.indexOf(email) >= 0) {
      return true;
    }

    console.log("User rejected because " + email + "isn't in the list of allowed email addresses.");

    return false;
  };

  everyauth.google
    .myHostname(config.hostname)
    .appId(config.modules.google.appId)
    .appSecret(config.modules.google.appSecret)
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

  everyauth.google.authorize = function(auth) {
    if(requiredEmail) { if(!checkEmail(auth)) { return false; }; }
    if(requiredDomain) { if(!checkDomain(auth)) { return false }; }

    return true;
  };
  everyauth.google.title = "Google";

  if(requiredDomain) {
    console.warn(config.domain + " registered Google authentication for members of domains: " + requiredDomain.join(", "));
  }
  if(requiredEmail) {
    console.warn(config.domain + " registered Google authentication for users: " + requiredEmail.join(", "));
  }
};
