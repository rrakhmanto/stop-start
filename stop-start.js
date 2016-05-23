'use strict';
console.log('Loading function');
var AWS = require('aws-sdk');
AWS.config.region = 'ap-southeast-2';
var credentials = new AWS.SharedIniFileCredentials({profile: 'm.kempster'});
AWS.config.credentials = credentials;

var autoscaling = new AWS.AutoScaling(); 

var stopStart = stop;

const ZERO = 0;
const ONE = 1;

// Terminate the ASG instances by setting the group size to zero
autoscaling.describeAutoScalingGroups({}, function(err, data) {
  if (err) {
    console.log(err, err.stack);
  } else {
    console.log(data.AutoScalingGroups);
    if (stopStart === stop) {
      data.AutoScalingGroups.forEach(downsizeGroupSize);
    } else if (stopStart === start) {
      data.AutoScalingGroups.forEach(upsizeGroupSize);
    } else {
      console.log('Error: please choose eithet start or stop as the action to perform');
    }
  }
});

function downsizeGroupSize(group, number) {
  var updateParams = {
    AutoScalingGroupName: group.AutoScalingGroupName,
    MaxSize: ZERO,
    MinSize: ZERO
  }
  autoscaling.updateAutoScalingGroup(updateParams, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
    }
  });
}

function upsizeGroupSize(group, number) {
  var updateParams = {
    AutoScalingGroupName: group.AutoScalingGroupName,
    MaxSize: ONE,
    MinSize: ONE
  }
  autoscaling.updateAutoScalingGroup(updateParams, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
    }
  });
}
