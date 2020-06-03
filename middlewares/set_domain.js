const setDomain = function(domains) {
  return function(req, res, next) {
    let host = req.headers["host"];
    req.vdomain = domains[host] || domains["default"];

    if (req.vdomain) {
      next();
    } else {
      let cleanedDomain = host.replace(/[^A-Za-z0-9\-.:]/g, "");
      res.writeHead(500, {});
      res.end("Unrecognized domain " + cleanedDomain + " and no default domain set");
    }
  };
};

module.exports = setDomain;
