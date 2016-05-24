//'use strict';
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

// Keeps track of all instances to compare later
var asgInstances = [];
var instances = [];

// Launch or terminate the ASG instances by altering the group size
function handleAsgInstances() {
  console.log('Handling ASG instances...');
  autoscaling.describeAutoScalingGroups({}, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data.AutoScalingGroups);

      retrieveAsgInstances(data.AutoScalingGroups);

      if (stopStart === 'stop') {
        data.AutoScalingGroups.forEach(decreaseGroupSize);
      } else if (stopStart === 'start') {
        data.AutoScalingGroups.forEach(increaseGroupSize);
      } else {
        console.log('Error: please choose either start or stop as the action to perform');
      }
    }
  });
}

// Start or stop any standalone instances not covered by the ASGs
function handleStandaloneInstances() {
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

function retrieveAsgInstances(groups) {
  console.log('Starting ASG instance retrieval...');
  groups.forEach(recordAsgInstances);
  console.log(asgInstances);
  console.log('Completed ASG instance retrieval...');
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
      // console.log(data);
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
      // console.log(data);
      console.log('Finished starting ASG instances for ' + group.AutoScalingGroupName);
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

// Execute the main functions
handleAsgInstances();
handleStandaloneInstances();































