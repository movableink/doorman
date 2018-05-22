var config = require('../lib/config');

var domainNames = [];
for(var domain in config.domains) {
  domainNames.push(config.domains[domain].domain);
}

module.exports = require('greenlock-express').create({
  server: config.sslProd ? 'https://acme-v01.api.letsencrypt.org/directory' : 'staging',
  configDir: config.certDir,
  approveDomains: (opts, certs, cb) => {
    if (certs) {
      opts.domains = domainNames;
    } else {
      opts.email = config.adminEmail;
      opts.agreeTos = true;
    }
    cb(null, { options: opts, certs: certs });
  },
  renewWithin: 30 * 24 * 60 * 60 * 1000,
  renewBy: 20 * 24 * 60 * 60 * 1000,
  challenges: {
    'http-01': require('le-challenge-fs').create({ webrootPath: config.certDir + '/acme-challege' }),
    'tls-sni-01': require('le-challenge-sni').create({})
  },
  store: require('le-store-certbot').create({ webrootPath: config.certDir + '/acme-challenge' }),
  debug: config.debugOutput
});
