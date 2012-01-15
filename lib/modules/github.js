var conf = require('../../conf');

var checkOrganization = function(auth) {
  for(var i = 0; i < auth.github.user.organizations.length; i++) {
    var organization = auth.github.user.organizations[i];
    if(organization.login == conf.github.requiredOrganization) { return true; }
  }

  if(true || conf.github.debug == true) {
    console.debug("User rejected because they aren't in the '" + conf.github.requiredOrganization + "' organization.");
  }
  return false;
};

exports.setup = function(everyauth) {
  everyauth.github
    .appId(conf.github.appId)
    .appSecret(conf.github.appSecret)
    .findOrCreateUser( function (sess, accessToken, accessTokenExtra, ghUser) {
      var p = this.Promise();
      this.oauth.get(this.apiHost() + '/organizations', accessToken, function (err, data) {
        if (err) return p.fail(err);
        ghUser.organizations = JSON.parse(data).organizations;
        p.fulfill(ghUser);
      })
      return p;
    })
    .redirectPath('/');

  everyauth.github.authorize = checkOrganization;
  everyauth.github.title = "Github";
};
