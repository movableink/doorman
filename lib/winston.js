var winston = require('winston');
var fs = require('fs');

winston.setLevels(winston.config.syslog.levels);
winston.remove(winston.transports.Console);

var env = process.env.NODE_ENV || 'development';

if(env == 'development') {
  winston.add(winston.transports.Console, { colorize: true });
}

var logDir = __dirname + "/../log";
if(!fs.statSync(logDir)) {
  fs.mkdirSync();
}

winston.add(winston.transports.File, {
  filename: 'log/' + env + '.log',
  timestamp: true
});

// connect middleware
winston.middleware = function(req, res, next) {
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

module.exports = winston;
