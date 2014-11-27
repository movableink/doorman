var conf = require('./config');
var winston = require('winston');
var fs = require('fs');
var env = process.env.NODE_ENV || 'development';

conf.log = conf.log || {};
if(typeof conf.log.file === 'undefined') {
  conf.log.file = '../log/' + env + '.log';
}
if(typeof conf.log.console === 'undefined') {
   conf.log.console || (env === 'development');
}

var logTransports = [];
if( typeof conf.log.file === 'string') {
  logTransports.push(new (winston.transports.File)({filename: conf.log.file}));
}
if( conf.log.console === true ) {
  logTransports.push(new (winston.transports.Console)({ colorize: true }));
}
var logger = new (winston.Logger)({transports: logTransports});

logger.setLevels(winston.config.syslog.levels);

// connect middleware
logger.middleware = function(req, res, next) {
  var self = this;

  function quote(str) {
    return '"' + str + '"';
  }

  return function(req, res, next) {
    var remoteIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    var httpVersion = req.httpVersionMajor + '.' + req.httpVersionMinor;
    var httpSignature = [req.method, req.originalUrl, 'HTTP/' + httpVersion].join(' ');

    next();

    self.info([
      remoteIp,
      '-',
      '-',
      '[' + new Date().toUTCString() + ']',
      quote(httpSignature),
      res.statusCode,
      (res._headers || {})['content-length'],
      quote(req.headers['referer'] || req.headers['referrer'] || ''),
      quote(req.headers['user-agent'])
    ].join(' '));
  };
};

module.exports = logger;
