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
var environment = 'dev';

const ZERO = 0;
const ONE = 1;
const TWO = 2;

// Keeps track of all instances to compare later
var asgInstances = [];
var instances = [];

function checkInput(stopStart) {
  if (stopStart !== 'stop' && stopStart !== 'start') {
    console.log('ERROR: please choose either start or stop as the action to perform');
    process.exit(1);
  }
}

//////////////////////////////// ASG FUNCTIONS ////////////////////////////////

// Launch or terminate the ASG instances by altering the group size
// Note this will run regardeless of whether or not there are any instances in the
// ASGs and what state they are in as it is not manipulating the instances directly
function describeAsgInstances() {
  console.log('Retrieving ASG instances...');
  autoscaling.describeAutoScalingGroups({}, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      // console.log(data);
      if (data.AutoScalingGroups.length > 0) {
        var results = [];
        for (var i = 0; i < data.AutoScalingGroups.length; i++) {
          var tagMissing = true;
          for (var j = 0; j < data.AutoScalingGroups[i].Tags.length; j++) {
            if (data.AutoScalingGroups[i].Tags[j].Key === 'environment') {
              tagMissing = false;
              if (data.AutoScalingGroups[i].Tags[j].Value === environment) {
                results.push(data.AutoScalingGroups[i]);
              }
            }
          }
          if (tagMissing === true) {
            console.log('WARNING: environment tag not found for ' + data.AutoScalingGroups[i].AutoScalingGroupName + ', this ASG will not be handled');
          }
        }
        // Get the list of all ASG instances
        retrieveAsgInstances(results);
        console.log('ASG instances: ', asgInstances);
        // Launch or terminate ASG instances if reporting only not specified
        if (!reportOnly) {
          handleAsgInstances(results);
        }
      } else {
        console.log('No ASG instances present in this environment, moving on...');
      }
    }
  });
}

// Initiate the ASG updatng process
function handleAsgInstances(groups) {
  console.log('Handling ASG instances...');
  if (stopStart === 'stop') {
    groups.forEach(decreaseGroupSize);
  } else {
    groups.forEach(increaseGroupSize);
  }
}

// Sets instance quantity parameters in an ASG to relevant hardcoded value (should be zero)
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

// Sets instance quantity parameters in an ASG to relevant hardcoded value (shoule be greater that zero)
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

// Iterates over all ASGs to get all instances inside them
function retrieveAsgInstances(groups) {
  console.log('Commencing ASG instance retrieval...');
  groups.forEach(recordAsgInstances);
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

//////////////////////////////// STANDALONE FUNCTIONS ////////////////////////////////

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
          recordStandaloneInstances(data.Reservations[i].Instances);
        }
        console.log('Standalone instances: ', instances);
        // Start or stop the standalone instances if reporting only not specified
        if (!reportOnly) {
          handleStandaloneInstances(instances);
        }
      } else {
        console.log('No standalone instances present in this environment, moving on...');
      }
    }
  });
}

// Initiate the standalone updatng process
function handleStandaloneInstances(instances) {
  console.log('Handling standalone instances...');
  if (stopStart === 'stop') {
    stopInstances(instances);
  } else {
    startInstances(instances);
  }
}

// Attempts to stop all instances supplied
function stopInstances(instances) {
  console.log('Stopping standalone instances...');
  if (instances.length > 0) {
    ec2.stopInstances({InstanceIds: instances}, function(err, data) {
      if (err) {
        console.log(err, err.stack);
      } else {
        // console.log(data);
        console.log('Finished stopping standalone instances');
      }
    });
  } else {
    console.log('No standalone instances supplied to stop');
  }
}

// Attempts to start all instances supplied
function startInstances(instances) {
  console.log('Starting standalone instances...');
  if (instances.length > 0) {
    ec2.startInstances({InstanceIds: instances}, function(err, data) {
      if (err) {
        console.log(err, err.stack);
      } else {
        // console.log(data);
        console.log('Finished starting standalone instances');
      }
    });
  } else {
    console.log('No standalone instances supplied to start');
  }
}

// Retrieve all instance IDs accorring to their environment type
// Ignores recently terminated instances as they hang around for a while
function recordStandaloneInstances(instances) {
  // console.log('Recording all instances in the reservation...');
  for (var i = 0; i < instances.length; i++) {
    var results = { Environment: null, Asg: false };
    for (var j = 0; j < instances[i].Tags.length; j++) {
      if (instances[i].Tags[j].Key === 'environment') {
        results.Environment = instances[i].Tags[j].Value;
      }
      if (instances[i].Tags[j].Key === 'aws:autoscaling:groupName') {
        results.Asg = true;
      }
    }
    if (results.Asg === false && results.Environment === environment) {
      filterOutStuff(instances[i]);
    }
    // Report any stray instances without an environment tag
    if (results.Environment === null) {
      console.log('WARNING: environment tag not found for ' + instances[i].InstanceId + ', this instance will not be handled');
    }
  }
}

// Remove instances that are in a transient state
// Also ignores instances that are already in the state that is trying to be accomplished
// Note this will also include and check any instances in ASGs, these will get filtered out later
function filterOutStuff(instance) {
  var transientStates = ['pending', 'shutting-down', 'stopping'];
  if (transientStates.indexOf(instance.State.Name) > -1) {
    console.log('WARNING: instance is in a ' + instance.State.Name + ' state, ignoring...');
    console.log('Please wait a minute or two and try running the operation again');
    console.log('Otherwise you may want to see what this instance is doing in the console as it may be having issues');
  } else if (instance.State.Name === 'stopped' && stopStart === 'stop') {
    console.log('Instance ' + instance.InstanceId + ' already stopped, ignoring...');
  } else if (instance.State.Name === 'running' && stopStart === 'start') {
    console.log('Instance ' + instance.InstanceId + ' already started, ignoring...');
  } else if (instance.State.Name !== 'terminated') {
    instances.push(instance.InstanceId);
  }
}

//////////////////////////////// FUNCTION INVOCATION ////////////////////////////////

checkInput(stopStart);
describeAsgInstances();
describeStandaloneInstances();































