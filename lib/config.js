var confFile = (process.argv[2] ? process.argv[2] : '../conf')
try { var conf = require(confFile); } catch(e) {
  console.log("Missing conf.js.  Please copy conf.example.js to conf.js and edit it.");
  process.exit(1);
}

module.exports = conf;
