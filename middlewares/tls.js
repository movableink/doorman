var conf = require('../conf');

/**
 * Check whether Transport Layer Security (TLS) is forced in the config. If
 * forceTLS option is set to true, redirect all unsecured HTTP traffic to HTTPS.
 **/
module.exports = function forceTLS(req, res, next) {
  if (conf.forceTLS && conf.securePort && !req.secure) {
    var redirectPath = ['https://', req.hostname];

    if (conf.securePort != 443) {
      redirectPath.push(':');
      redirectPath.push(conf.securePort);
    }

    redirectPath.push(req.url);

    return res.redirect(301, redirectPath.join(''));
  }
  next();
}
