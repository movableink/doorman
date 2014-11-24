var conf = require('../../conf');
var url = require('url');
var log = require('../winston');

var checkOrganization = function(auth) {
  for(var i = 0; i < auth.github.user.organizations.length; i++) {
    var organization = auth.github.user.organizations[i];
    if(organization.login == conf.modules.github.requiredOrganization) { return true; }
  }

  log.notice("User rejected because they aren't in the '" + conf.modules.github.requiredOrganization + "' organization.");

  return false;
};

exports.setup = function(everyauth) {
  everyauth.github
    .myHostname(conf.hostname)
    .appId(conf.modules.github.appId)
    .appSecret(conf.modules.github.appSecret)
    .scope('user')
    .callbackPath(conf.modules.github.callbackPath)
    .entryPath(conf.modules.github.entryPath)
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
      res.render('auth_error.jade', {
        pageTitle: 'Error authenticating with Github',
        currentProvider: 'Github',
        providers: everyauth.enabled,
        error: parsedUrl.query.error });
    })
    .redirectPath('/');

  everyauth.github.authorize = checkOrganization;
  everyauth.github.title = "Github";

  // // monkey patch everyauth to let us do custom redirects
  // everyauth.github.sendResponse( function (res) {
  //   var redirectTo = (res.req.session && res.req.session.redirectTo) || this.redirectPath();
  //   if (!redirectTo)
  //     throw new Error('You must configure a redirectPath');
  //   res.writeHead(303, {'Location': redirectTo});
  //   res.end();
  // })


  log.notice("Registered Github authentication for members of organization '" + conf.modules.github.requiredOrganization + "'.");
};
