const config = require("../lib/config");

let domainNames = [];
for (let domain in config.domains) {
  domainNames.push(config.domains[domain].domain);
}

module.exports = require("greenlock-express").create({
  version: "draft-11",
  server: config.sslProd
    ? "https://acme-v02.api.letsencrypt.org/directory"
    : "https://acme-staging-v02.api.letsencrypt.org/directory",
  configDir: config.certDir,
  email: config.adminEmail,
  agreeTos: true,
  approveDomains: domainNames,
  renewWithin: 30 * 24 * 60 * 60 * 1000,
  renewBy: 20 * 24 * 60 * 60 * 1000,
  challenges: {
    "http-01": require("le-challenge-fs").create({
      webrootPath: config.certDir + "/acme-challenge"
    })
  },
  store: require("le-store-certbot").create({
    webrootPath: config.certDir + "/acme-challenge"
  }),
  debug: config.debugOutput
});