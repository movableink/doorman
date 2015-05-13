module.exports = function log(req, res, next) {
  var date = new Date().toISOString();

  console.log([date,
               req.method,
               req.url].join(' '));
  next();
}
