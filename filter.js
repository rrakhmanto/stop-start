var asgInstances = [0, 1, 2, 3, 9];
var instances = [2, 3, 4, 5, 6, 7, 8];

function filterInstances() {
  results = [];
  instances.forEach(function(instance) {
    if (asgInstances.indexOf(instance) === -1) {
      results.push(instance);
    }
  });
  return results;
}

console.log(filterInstances());
