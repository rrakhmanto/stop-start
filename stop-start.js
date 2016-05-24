'use strict';
console.log('Loading function');
var AWS = require('aws-sdk');
AWS.config.region = 'ap-southeast-2';
var credentials = new AWS.SharedIniFileCredentials({profile: 'm.kempster'});
AWS.config.credentials = credentials;

var autoscaling = new AWS.AutoScaling(); 
var ec2 = new AWS.EC2();
var stopStart = 'start';

const ZERO = 0;
const ONE = 1;
const TWO = 2;

// Keeps track of all instances in ASGs
var asgInstances = [];
var instances = [];

// Launch or terminate the ASG instances by altering the group size
console.log('Handling ASG instances...');
autoscaling.describeAutoScalingGroups({}, function(err, data) {
  if (err) {
    console.log(err, err.stack);
  } else {
    console.log(data.AutoScalingGroups);

    if (stopStart === 'stop') {
      data.AutoScalingGroups.forEach(decreaseGroupSize);
    } else if (stopStart === 'start') {
      //data.AutoScalingGroups.forEach(increaseGroupSize);
      handleInstances(data.AutoScalingGroups);
    } else {
      console.log('Error: please choose either start or stop as the action to perform');
    }
  }
});

// Recursively call the increase group size function until the last element
// Then call it again with the flag set to continue on with the standalone instances
// So this will fire off processes to update each ASG with the last one to move on
// But how do I know that the last one to be fired off will actually finish last?
// Tesrting reveals that they can finish in any order which is a pain...
function handleInstances(groups) {
  if (groups.length === 0) {
    console.log('No ASGs found, moving on to the standalone instances...');
  } else if (groups.length === 1) {
    increaseGroupSize(groups[0], true);
  } else {
    increaseGroupSize(groups[0], false);
    groups.shift();
    handleInstances(groups);
  }
}

// Start or stop any standalone instances not covered by the ASGs
function standaloneInstances() {
  console.log('Handling standalone instances...');
  ec2.describeInstances({}, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);

      for (var i = 0; i < data.Reservations.length; i++) {
        recordInstances(data.Reservations[i].Instances);
      }

      console.log(instances);
    }
  });
}

function decreaseGroupSize(group) {
  var updateParams = {
    AutoScalingGroupName: group.AutoScalingGroupName,
    MaxSize: ZERO,
    MinSize: ZERO
  }
  console.log('Stopping ASG instances for ' + group.AutoScalingGroupName + ' ...');
  recordAsgInstances(group);
  autoscaling.updateAutoScalingGroup(updateParams, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
      console.log(asgInstances);
    }
  });
}

function increaseGroupSize(group, flag) {
  var updateParams = {
    AutoScalingGroupName: group.AutoScalingGroupName,
    MaxSize: TWO,
    MinSize: TWO
  }
  console.log('Starting ASG instances for ' + group.AutoScalingGroupName + ' ...');
  recordAsgInstances(group);
  autoscaling.updateAutoScalingGroup(updateParams, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      // console.log(data);
      // console.log(asgInstances);
      console.log('Finished starting ASG instances in ' + group.AutoScalingGroupName);
      if (flag) {
        standaloneInstances();
      }
    }
  });
}

// Retrieve the ASG instance IDs for later use
function recordAsgInstances(group) {
  console.log('Recording ASG instances for ' + group.AutoScalingGroupName + ' ...');
  for (var i = 0; i < group.Instances.length; i++) {
    asgInstances.push(group.Instances[i].InstanceId);
  }
}

// Retrieve the standalone instance IDs for later use
function recordInstances(array) {
  console.log('Recording standalone instances...');
  for (var i = 0; i < array.length; i++) {
    instances.push(array[i].InstanceId);
  }
}

































