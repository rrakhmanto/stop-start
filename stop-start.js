'use strict';
console.log('Loading function');
var AWS = require('aws-sdk');
AWS.config.region = 'ap-southeast-2';
var credentials = new AWS.SharedIniFileCredentials({profile: 'm.kempster'});
AWS.config.credentials = credentials;

var autoscaling = new AWS.AutoScaling(); 

// Terminate the ASG instances by setting the group size to zero
autoscaling.describeAutoScalingGroups({}, function(err, data) {
  if (err) {
    console.log(err, err.stack);
  } else {
    console.log(data.AutoScalingGroups);

    data.AutoScalingGroups.forEach(adjustGroupSize, 0);
  }
});

function adjustGroupSize(group, number) {
  var updateParams = {
    AutoScalingGroupName: group.AutoScalingGroupName,
    MaxSize: number,
    MinSize: number
  }
  autoscaling.updateAutoScalingGroup(updateParams, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
    }
  });
}
