const process = require("process");
const morgan = require("morgan");

morgan.token("pid", function getPid() {
  return process.pid;
});

function jsonFormat(tokens, req, res) {
  return JSON.stringify({
    remoteAddress: tokens["remote-addr"](req, res),
    host: tokens["req"](req, res, "host"),
    date: tokens["date"](req, res, "iso"),
    method: tokens["method"](req, res),
    url: tokens["url"](req, res),
    httpVersion: tokens["http-version"](req, res),
    statusCode: tokens["status"](req, res),
    contentLength: tokens["res"](req, res, "content-length"),
    referrer: tokens["referrer"](req, res),
    userAgent: tokens["user-agent"](req, res),
    responseTime: tokens["response-time"](req, res),
    pid: tokens["pid"](req, res)
  });
}

module.exports = morgan(jsonFormat);
