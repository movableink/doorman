var conf = require('../../conf');
var url = require('url');
var log = require('../winston');

var checkDomain = function(auth) {
  var email = auth.google.user.email.split('@');
  if(email.length == 2 && email[1] == conf.modules.google.requiredDomain) {
    return true;
  }

  log.notice("User rejected because they aren't in the '" + conf.modules.google.requiredDomain + "' domain.");

  return false;
};

exports.setup = function(everyauth) {
  everyauth.google
    .myHostname(conf.hostname)
    .appId(conf.modules.google.appId)
    .appSecret(conf.modules.google.appSecret)
    .scope('https://www.googleapis.com/auth/userinfo.email')
    .findOrCreateUser( function (sess, accessToken, accessTokenExtra, googleUser) {
      return googleUser;
    })
    .handleAuthCallbackError( function (req, res) {
      var parsedUrl = url.parse(req.url, true);
      res.render('auth_error.jade', {
        pageTitle: 'Error authenticating with Google',
        currentProvider: 'Google',
        providers: everyauth.enabled,
        error: parsedUrl.query.error });
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

  everyauth.google.authorize = checkDomain;
  everyauth.google.title = "Google";

  // // monkey patch everyauth to let us do custom redirects
  // everyauth.google.sendResponse( function (res) {
  //   var redirectTo = (res.req.session && res.req.session.redirectTo) || this.redirectPath();
  //   if (!redirectTo)
  //     throw new Error('You must configure a redirectPath');
  //   res.writeHead(303, {'Location': redirectTo});
  //   res.end();
  // })

  log.notice("Registered Google authentication for members of domain '" + conf.modules.google.requiredDomain + "'.");
};
