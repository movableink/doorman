"use strict";

function log(data, device = "log") {
  if (typeof data === "string") {
    data = { message: data };
  }

  data.date = new Date().toISOString();
  console[device](JSON.stringify(data));
}

function logStdout(data) {
  log(data, "log");
}

function logStderr(data) {
  log(data, "error");
}

module.exports = {
  debug: logStdout,
  info: logStdout,
  error: logStderr,
  notice: logStderr,
  warn: logStderr
};
