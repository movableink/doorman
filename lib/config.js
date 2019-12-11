const fs = require("fs");
const path = require("path");
const program = require("commander");
const log = require("./log");

const configDir = path.resolve(path.dirname(module.filename) + "/../config");
const configFile = path.resolve(
  process.env.DOORMAN_CONFIG || [configDir, "app.js"].join("/")
);
if (!fs.existsSync(configFile)) {
  log.error({
    error: { type: "config", message: "Missing file", file: configFile }
  });
  process.exit(1);
}

program
  .option("-p, --port <n>", "Port to listen on", parseInt)
  .parse(process.argv);

var config = require(configFile);

config.port = program.port || config.port;
if (!config.port) {
  attributeError(configFile, "port");
}

config.domains = config.domains || {};

function attributeError(file, attribute) {
  log.error({
    error: { type: "config", message: "Missing attribute", file, attribute }
  });
  process.exit(1);
}

function validate(c) {
  if (!c.domain) {
    return "domain";
  }
  if (!c.proxyTo) {
    return "proxyTo";
  }
  if (!c.proxyTo.host) {
    return "proxyTo.host";
  }
  if (!c.proxyTo.port) {
    return "proxyTo.port";
  }
  if (!c.modules) {
    return "modules";
  }

  return false;
}

function addDefaultOptions(c) {
  let newConf = c;
  for (let k in config) {
    if (config.hasOwnProperty(k) && k != "domains") {
      newConf[k] = c[k] || config[k];
    }
  }
  return newConf;
}

var domainDir = [configDir, "domains"].join("/");
var domainFiles = fs.readdirSync(domainDir);

for (let i = 0; i < domainFiles.length; i++) {
  let file = domainFiles[i];
  if (!file.match(/\.js$/)) {
    continue;
  }

  let parsed = require(`${domainDir}/${file}`);
  parsed = addDefaultOptions(parsed);

  let error = validate(parsed);
  if (error) {
    attributeError(file, error);
  } else {
    config.domains[parsed.domain] = parsed;
  }
}

if (Object.keys(config.domains).length == 0) {
  log.error({
    error: {
      type: "config",
      message: "Could not parse any domain files from config/domains"
    }
  });
}

module.exports = config;
