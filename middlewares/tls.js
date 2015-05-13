var config = require('../lib/config');

/**
 * Check whether Transport Layer Security (TLS) is forced in the config. If
 * forceTLS option is set to true, redirect all unsecured HTTP traffic to HTTPS.
 **/
module.exports = function forceTLS(req, res, next) {
  if (config.forceTLS && config.securePort && !req.secure) {
    var redirectPath = ['https://', req.hostname];

    if (config.securePort != 443) {
      redirectPath.push(':');
      redirectPath.push(config.securePort);
    }

    redirectPath.push(req.url);

    return res.redirect(301, redirectPath.join(''));
  }
  next();
}
