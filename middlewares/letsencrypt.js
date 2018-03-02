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
  challenges: { 'http-01': require('le-challenge-fs').create({ webrootPath: config.certDir + '/acme-challege' }) },
  store: require('le-store-certbot').create({ webrootPath: config.certDir + '/acme-challenge' }),
  debug: config.debugOutput
});
