'use strict';
console.log('Loading function');
var AWS = require('aws-sdk');
AWS.config.region = 'ap-southeast-2';
var credentials = new AWS.SharedIniFileCredentials({profile: 'm.kempster'});
AWS.config.credentials = credentials;
var autoscaling = new AWS.AutoScaling(); 
var ec2 = new AWS.EC2();

var stopStart = 'stop';
var reportOnly = false;

const ZERO = 0;
const ONE = 1;
const TWO = 2;

// Keeps track of all instances to compare later
var asgInstances = [];
var instances = [];

function checkInput(stopStart) {
  if (stopStart !== 'stop' && stopStart !== 'start') {
    console.log('Error: please choose either start or stop as the action to perform');
    process.exit(1);
  }
}

// Launch or terminate the ASG instances by altering the group size
function describeAsgInstances() {
  console.log('Retrieving ASG instances...');
  autoscaling.describeAutoScalingGroups({}, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      // console.log(data);
      if (data.AutoScalingGroups.length > 0) {
        // Get the list of all ASG instances
        retrieveAsgInstances(data.AutoScalingGroups);
        // Launch or terminate ASG instances if specified
        if (!reportOnly) {
          handleAsgInstances(data.AutoScalingGroups);
        }
      } else {
        console.log('No standalone instances present in this environment, moving on...');
      }
    }
  });
}

function handleAsgInstances(groups) {
  console.log('Handling ASG instances...');
  if (stopStart === 'stop') {
    groups.forEach(decreaseGroupSize);
  } else {
    groups.forEach(increaseGroupSize);
  }
}

// Start or stop any standalone instances not covered by the ASGs
function describeStandaloneInstances() {
  console.log('Handling standalone instances...');
  ec2.describeInstances({}, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      // console.log(data);
      if (data.Reservations.length > 0) {
        // Get the list of all instances
        for (var i = 0; i < data.Reservations.length; i++) {
          recordInstances(data.Reservations[i].Instances);
        }
        console.log('All instances: ', instances);
        // Filter out the instances in ASGs
        var filteredInstances = filterInstances();
        console.log('Filtered instances: ', filteredInstances);
        // Start or stop the standalone instances if specified
        if (!reportOnly) {
          handleStandaloneInstances(filteredInstances);
        }
      } else {
        console.log('No ASGs present in this environment, moving on...');
      }
    }
  });
}

function handleStandaloneInstances(imnstances) {
  console.log('Handling standalone instances...');
  if (stopStart === 'stop') {
    stopInstances(instances);
  } else {
    startInstances(instances);
  }
}

function decreaseGroupSize(group) {
  var updateParams = {
    AutoScalingGroupName: group.AutoScalingGroupName,
    MaxSize: ZERO,
    MinSize: ZERO
  }
  console.log('Stopping ASG instances for ' + group.AutoScalingGroupName + ' ...');
  autoscaling.updateAutoScalingGroup(updateParams, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
      console.log('Finished stopping ASG instances for ' + group.AutoScalingGroupName);
    }
  });
}

function increaseGroupSize(group) {
  var updateParams = {
    AutoScalingGroupName: group.AutoScalingGroupName,
    MaxSize: TWO,
    MinSize: TWO
  }
  console.log('Starting ASG instances for ' + group.AutoScalingGroupName + ' ...');
  autoscaling.updateAutoScalingGroup(updateParams, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
      console.log('Finished starting ASG instances for ' + group.AutoScalingGroupName);
    }
  });
}

// Compare the two sets of instances as we want to exclude anhy instances in ASGs
function filterInstances() {
  var results = [];
  instances.forEach(function(instance) {
    if (asgInstances.indexOf(instance) === -1) {
      results.push(instance);
    }
  });
  return results;
}

function stopInstances(instances) {
  console.log('Stopping standalone instances...')
  ec2.stopInstances({InstanceIds: instances}, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
      console.log('Finished stopping standalone instances');
    }
  });
}

function startInstances(instances) {
  console.log('Starting standalone instances...')
  ec2.startInstances({InstanceIds: instances}, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
      console.log('Finished starting standalone instances');
    }
  });
}

// Iterates over all ASGs to get all instances inside them
function retrieveAsgInstances(groups) {
  console.log('Starting ASG instance retrieval...');
  groups.forEach(recordAsgInstances);
  console.log('ASG instances: ', asgInstances);
  console.log('Completed ASG instance retrieval');
}

// Retrieve the ASG instance IDs
function recordAsgInstances(group) {
  console.log('Recording ASG instances for ' + group.AutoScalingGroupName + ' ...');
  for (var i = 0; i < group.Instances.length; i++) {
    if (group.Instances[i] !== 'terminated') {
      asgInstances.push(group.Instances[i].InstanceId);
    }
  }
}

// Retrieve the standalone instance IDs
function recordInstances(array) {
  console.log('Recording standalone instances...');
  for (var i = 0; i < array.length; i++) {
    // Ignore recently terminated instances as they can hang around for a while
    if (array[i].State.Name !== 'terminated') {
      instances.push(array[i].InstanceId);
    }
  }
}

// Execute the main functions
checkInput(stopStart);
describeAsgInstances();
describeStandaloneInstances();































