function date() {
  return new Date().toISOString();
}

exports.info = function(line) {
  console.log([date(), line].join(' '));
};

exports.error = function(line) {
  console.error([date(), line].join(' '));
};

exports.warn = exports.error;
