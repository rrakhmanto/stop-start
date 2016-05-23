'use strict';
console.log('Loading function');
var AWS = require('aws-sdk');
AWS.config.region = 'ap-southeast-2';
var credentials = new AWS.SharedIniFileCredentials({profile: 'm.kempster'});
AWS.config.credentials = credentials;

var autoscaling = new AWS.AutoScaling(); 

autoscaling.describeAutoScalingGroups({}, function(err, data) {
  if (err) console.log(err, err.stack);
  else     console.log(data);
});
