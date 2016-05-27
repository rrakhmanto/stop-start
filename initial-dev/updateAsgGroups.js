// Test file to deveop this function

groups = [1, 2, 3];

function updateAsgGroups(groups, counter) {
  if (counter === 0) {
    return groups;
  } else {
    groups[counter - 1]++;
    updateAsgGroups(groups, --counter);
  }
}

updateAsgGroups(groups, groups.length);
console.log(groups);
