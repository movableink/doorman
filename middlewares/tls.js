var conf = require('../../conf');

/**
 * Check whether Transport Layer Security (TLS) is forced in the config. If
 * forceTLS option is set to true, redirect all unsecured HTTP traffic to HTTPS.
 **/
module.exports = function forceTLS(req, res, next) {
  if (conf.forceTLS && conf.securePort && !req.secure) {
    return res.redirect(['https://', req.get('Host'), req.url].join(''));
  }
  next();
}
