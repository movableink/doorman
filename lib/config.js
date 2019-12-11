var fs = require('fs');
var path = require('path');
var program  = require('commander');

var configDir = path.resolve(path.dirname(module.filename) + '/../config');
var configFile = path.resolve(process.env.DOORMAN_CONFIG || [configDir, 'app.js'].join('/'));
if(!fs.existsSync(configFile)) {
  console.error(`Missing config file: ${configFile}`);
  process.exit(1);
}

program.option('-p, --port <n>', 'Port to listen on', parseInt).parse(process.argv);

var config = require(configFile);

config.port = program.port || config.port;
if(!config.port) { error("config file missing 'port' attribute") }

config.domains = config.domains || {};

function error(msg) {
  console.error(msg);
  process.exit(1);
}

function validate(c, file) {
  if(!c.domain)       { return `File ${file} missing 'domain' attribute`; }
  if(!c.proxyTo)      { return `File ${file} missing 'proxyTo' attribute`;}
  if(!c.proxyTo.host) { return `File ${file} missing 'proxyTo.host' attribute`; }
  if(!c.proxyTo.port) { return `File ${file} missing 'proxyTo.port' attribute`; }
  if(!c.modules)      { return `File ${file} missing 'modules' attribute`; }

  return false;
}

function addDefaultOptions(c) {
  var newConf = c;
  for(var k in config) {
    if(config.hasOwnProperty(k) && k != "domains") {
      newConf[k] = c[k] || config[k];
    }
  }
  return newConf;
}

var domainDir = [configDir, 'domains'].join('/')
var domainFiles = fs.readdirSync(domainDir);

for(var i = 0; i < domainFiles.length; i++) {
  var file = domainFiles[i];
  if(!file.match(/\.js$/)) { continue; }

  var parsed = require(`${domainDir}/${file}`);
  parsed = addDefaultOptions(parsed);

  var error = validate(parsed, file);
  if(error) {
    console.error(error);
  } else {
    config.domains[parsed.domain] = parsed;
  }
}

if(Object.keys(config.domains).length == 0) {
  console.error("Could not parse any domain files, make sure you have added them to config/domains");
}

module.exports = config;
