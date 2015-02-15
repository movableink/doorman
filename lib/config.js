var path = require('path');
var log = require('./log');

// Conf file is specified from the root of the doorman app
var confFile = path.resolve(process.env.DOORMAN_CONFIG || process.argv[2] || 'conf');

try { var conf = require(confFile); } catch(e) {
  log.error("Missing conf.js.  Please copy conf.example.js to conf.js and edit it.");
  process.exit(1);
}

module.exports = conf;
