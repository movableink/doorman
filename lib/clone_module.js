var everyauth = require('everyauth');

module.exports = function(name) {
  var mod = Object.create(everyauth[name]);
  mod._configurable = everyauth[name]._configurable;
  mod._stepSequences = {};
  for (var seqName in everyauth[name]._stepSequences) {
    mod._stepSequences[seqName] = everyauth[name]._stepSequences[seqName].clone(mod);
  }
  mod._steps = {};
  for (var stepName in everyauth[name]._steps) {
    mod._steps[stepName] = everyauth[name]._steps[stepName].clone(stepName, mod);
  }

  return mod;
};
