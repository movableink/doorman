var url = require('url');

exports.setup = function(everyauth, config) {
  if(config.modules.github) {
    var requiredOrganization = config.modules.github.requiredOrganization;
    if(requiredOrganization && !requiredOrganization.push) { requiredOrganization = [requiredOrganization]; }

    var requiredEmail = config.modules.github.requiredEmail;
    if(requiredEmail && !requiredEmail.push) { requiredEmail = [requiredEmail]; }

    if(!requiredEmail && !requiredOrganization) {
      console.error("Config must specify either requiredEmail or requiredOrganization.");
      process.exit(1);
    }
  }

  var checkOrganization = function(auth) {
    var organizations = auth.github.user.organizations;

    for(var i = 0; i < requiredOrganization.length; i++) {
      for(var j = 0; j < organizations.length; j++) {
        var organization = organizations[j];
        if(organization.login == requiredOrganization[i]) { return true; }
      }
    }

  console.info("User rejected because they aren't in the organization list: " + requiredOrganization.join(", "));

    return false;
  };

  var checkEmail = function(auth) {
    var email = auth.github.user.email;
    if(requiredEmail.indexOf(email) >= 0) {
      return true;
    }

    console.info("User rejected because " + email + " isn't in the list of allowed email addresses.");

    return false;
  }

  everyauth.github
    .myHostname(config.hostname)
    .appId(config.modules.github.appId)
    .appSecret(config.modules.github.appSecret)
    .scope('user:email,read:org')
    .callbackPath(config.modules.github.callbackPath)
    .entryPath(config.modules.github.entryPath)
    .findOrCreateUser( function (sess, accessToken, accessTokenExtra, ghUser) {
      var p = this.Promise();
      this.oauth.get(this.apiHost() + '/user/orgs', accessToken, function (err, data) {
        if (err) return p.fail(err);
        ghUser.organizations = [];
        var organizations = JSON.parse(data);
        for(var i = 0; i < organizations.length; i++) {
          ghUser.organizations.push({login: organizations[i].login});
        }
        p.fulfill(ghUser);
      })
      return p;
    })
    .authCallbackDidErr( function (req) {
      var parsedUrl = url.parse(req.url, true);
      return parsedUrl.query && !!parsedUrl.query.error;
    })
    .handleAuthCallbackError( function (req, res) {
      var parsedUrl = url.parse(req.url, true);
      req.flash('error', 'Error authenticating with Github: ' + parsedUrl.query.error);
      res.redirectTo('/');
    })
    .redirectPath('/');

  everyauth.github.authorize = function(auth) {
    if(requiredOrganization) { if(!checkOrganization(auth)) { return false; }; }
    if(requiredEmail) { if(!checkEmail(auth)) { return false; } }

    return true;
  };
  everyauth.github.title = "Github";

  if(requiredOrganization) {
    console.warn(config.domain + " registered Github authentication for members of organizations: " + requiredOrganization.join(", "));
  }
  if(requiredEmail) {
    console.warn(config.domain + " registered Github authentication for users: " + requiredEmail.join(", "));
  }
};
