'use strict';
console.log('Loading function...');
var AWS = require('aws-sdk');

exports.handler = (event, context, callback) => {
  AWS.config.region = event.region;
  var autoscaling = new AWS.AutoScaling(); 
  var ec2 = new AWS.EC2();
  var dynamodb = new AWS.DynamoDB();

  const ZERO = 0;

  function checkInput() {
    if (event.stopStart !== 'stop' && event.stopStart !== 'start') {
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
          // Filter ASGs based on environment tag
          var results = filterAsgs(data.AutoScalingGroups);
          // Get the list of all ASG instances for reporting
          var asgInstances = retrieveAsgInstances(results);
          console.log('ASG instances: ', asgInstances);
          // Launch or terminate ASG instances if reporting only not specified
          if (!event.reportOnly) {
            handleAsgInstances(results);
          }
        } else {
          console.log('No ASG instances present in this account, moving on...');
        }
      }
    });
  }

  // Filters out ASGs based on what environment type they belong to
  // Will not consider groups that have zero instances when attempting a stop operation
  function filterAsgs(groups) {
    console.log('Filtering ASGs...')
    var results = [];
    for (var i = 0; i < groups.length; i++) {
      if (event.stopStart === 'start' || (event.stopStart === 'stop' && groups[i].MaxSize > 0)) {
        var tagMissing = true;
        for (var j = 0; j < groups[i].Tags.length; j++) {
          if (groups[i].Tags[j].Key.toUpperCase() === 'ENVIRONMENT') {
            tagMissing = false;
            if (groups[i].Tags[j].Value === event.environment) {
              results.push(groups[i]);
            }
          }
        }
        if (tagMissing === true) {
          console.log('WARNING: environment tag not found for ' + groups[i].AutoScalingGroupName + ', this ASG will not be handled');
        }
      }
    }
    return results;
  }

  // Iterates over all ASGs to get all instances inside them, used for reporting
  function retrieveAsgInstances(groups) {
    console.log('Commencing ASG instance retrieval...');
    var results = [];
    groups.forEach( function(group) {
      console.log('Recording ASG instances for ' + group.AutoScalingGroupName + ' ...');
      for (var i = 0; i < group.Instances.length; i++) {
        if (group.Instances[i] !== 'terminated') {
          results.push(group.Instances[i].InstanceId);
        }
      }
    });
    console.log('Completed ASG instance retrieval');
    return results;
  }

  // Initiate the ASG updatng process
  function handleAsgInstances(groups) {
    console.log('Handling ASG instances...');
    if (event.stopStart === 'stop') {
      recordAsgInfo(groups);
      groups.forEach(decreaseGroupSize);
    } else {
      updateAsgGroups(groups, groups.length);
    }
  }

  // Sets instance quantity parameters in an ASG to relevant hardcoded value (should be zero)
  function decreaseGroupSize(group) {
    var updateParams = {
      AutoScalingGroupName: group.AutoScalingGroupName,
      MinSize: ZERO,
      MaxSize: ZERO,
      DesiredCapacity: ZERO
    };
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
      MinSize: group.MinSize,
      MaxSize: group.MaxSize,
      DesiredCapacity: group.DesiredCapacity
    };
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

  //////////////////////////////// STANDALONE FUNCTIONS ////////////////////////////////

  // Start or stop any standalone instances not covered by the ASGs
  function describeStandaloneInstances() {
    console.log('Retrieving standalone instances...');
    ec2.describeInstances({}, function(err, data) {
      if (err) {
        console.log(err, err.stack);
      } else {
        // console.log(data);
        if (data.Reservations.length > 0) {
          // Get the list of all instances
          var results = [];
          for (var i = 0; i < data.Reservations.length; i++) {
            var interimResults = retrieveStandaloneInstances(data.Reservations[i].Instances);
            results = myConcat(results, interimResults);
          }
          console.log('Standalone instances: ', results);
          // Start or stop the standalone instances if reporting only not specified
          if (!event.reportOnly) {
            handleStandaloneInstances(results);
          }
        } else {
          console.log('No standalone instances present in this account, moving on...');
        }
      }
    });
  }

  // Retrieve all instance IDs accorring to their environment type
  // Ignores recently terminated instances as they hang around for a while
  function retrieveStandaloneInstances(instances) {
    console.log('Recording all instances in the reservation...');
    var instanceResults = [];
    for (var i = 0; i < instances.length; i++) {
      var tagResults = { Environment: null, Asg: false };
      for (var j = 0; j < instances[i].Tags.length; j++) {
        if (instances[i].Tags[j].Key.toUpperCase() === 'ENVIRONMENT') {
          tagResults.Environment = instances[i].Tags[j].Value;
        }
        if (instances[i].Tags[j].Key === 'aws:autoscaling:groupName') {
          tagResults.Asg = true;
        }
      }
      if (tagResults.Asg === false && tagResults.Environment === event.environment && filterInstance(instances[i])) {
        instanceResults.push(instances[i].InstanceId);
      }
      // Report any stray instances without an environment tag
      if (tagResults.Environment === null) {
        console.log('WARNING: environment tag not found for ' + instances[i].InstanceId + ', this instance will not be handled');
      }
    }
    return instanceResults;
  }

  // Initiate the standalone updatng process
  function handleStandaloneInstances(instances) {
    console.log('Handling standalone instances...');
    if (event.stopStart === 'stop') {
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

  //////////////////////////////// OTHER FUNCTIONS ////////////////////////////////

  // I wrote this as annoyingly concat() does not seem to work that way I expected it to
  function myConcat(array1, array2) {
    for (var i = 0; i < array2.length; i++) {
      array1.push(array2[i]);
    }
    return array1;
  }

  // Reports on whether or not an instance should be included in the results
  // Ignores terminated instances as well as those that are in a transient state
  // Also ignores an instance that is already in the state that is trying to be accomplished
  function filterInstance(instance) {
    if (instance.State.Name !== 'terminated') {
      if (!event.reportOnly) {
        var transientStates = ['pending', 'shutting-down', 'stopping'];
        if (transientStates.indexOf(instance.State.Name) > -1) {
          console.log('WARNING: instance ' + instance.InstanceId + 'is in a ' + instance.State.Name + ' state, ignoring...');
          console.log('Please wait a minute or two and try running the operation again');
          console.log('Otherwise you may want to see what this instance is doing in the console as it may be having issues');
          return false;
        } else if (instance.State.Name === 'stopped' && event.stopStart === 'stop') {
          console.log('Instance ' + instance.InstanceId + ' already stopped, ignoring...');
          return false;
        } else if (instance.State.Name === 'running' && event.stopStart === 'start') {
          console.log('Instance ' + instance.InstanceId + ' already started, ignoring...');
          return false;
        } else {
          return true;
        }
      } else {
        return true;
      }
    } else {
      return false;
    }
  }

  // Records the relevant ASG information for each group in the environment
  function recordAsgInfo(groups) {
    console.log('Recording ASG size data...');
    for (var i = 0; i < groups.length; i++) {
      var params = {
        TableName: event.tableName,
        Item: {
          AutoScalingGroupARN: { "S": groups[i].AutoScalingGroupARN },
          Environment: { "S": event.environment },
          MinSize: { "N": groups[i].MinSize.toString() },
          MaxSize: { "N": groups[i].MaxSize.toString() },
          DesiredCapacity: { "N": groups[i].DesiredCapacity.toString() }
        }
      };
      dynamodb.putItem(params, function(err, data) {
        if (err)  {
          console.log(err, err.stack);
        } else {
          console.log('Database addition successful');
        }
      });
    }
  }

  // Recursively runs over each ASG to update the size values from the database
  // Then calls increaseGroupSize when done
  function updateAsgGroups(groups, counter) {
    console.log('Restoring ASG size data...');
    if (counter === 0) {
      groups.forEach(increaseGroupSize);
    } else {
      var params = {
        TableName: event.tableName,
        Key: {
          AutoScalingGroupARN: { "S": groups[counter - 1].AutoScalingGroupARN },
        }
      };
      dynamodb.getItem(params, function(err, data) {
        if (err)  {
          console.log(err, err.stack);
        } else {
          // Update the relevant ASG with the previously stored size values
          groups[counter - 1].MinSize = Number(data.Item.MinSize.N);
          groups[counter - 1].MaxSize = Number(data.Item.MaxSize.N);
          groups[counter - 1].DesiredCapacity = Number(data.Item.DesiredCapacity.N);
          updateAsgGroups(groups, --counter);
        }
      });
    }
  }

  //////////////////////////////// FUNCTION INVOCATION ////////////////////////////////

  function goRun() {
    checkInput();
    describeAsgInstances();
    describeStandaloneInstances();
  }

  // Ensure that the table is ready before trying to access it
  function isTableReady(ready) {
    if (ready === true) {
      console.log('Table is ready');
      goRun();
    } else {
      console.log('Checking table for readiness...');
      dynamodb.describeTable({ TableName: event.tableName }, function(err, data) {
        if (err) {
          console.log(err, err.stack);
        } else {
          // console.log(data);
          if (data.Table.TableStatus === 'ACTIVE') {
            isTableReady(true);
          } else {
            isTableReady(false);
          }
        }
      });
    }
  }

  // New table parameters
  var tableParams = {
    AttributeDefinitions: [
      {
        AttributeName: "AutoScalingGroupARN",
        AttributeType: "S"
      }
    ],
    KeySchema: [
      {
        AttributeName: "AutoScalingGroupARN",
        KeyType: "HASH"
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1
    },
    TableName: event.tableName
  }

  // Program entry point
  // Make a call to see if the table exists yet and handle things accordingly
  console.log('Checking table...');
  dynamodb.describeTable({ TableName: event.tableName }, function(err, data) {
    if (err) {
      // console.log(err, err.stack);
      console.log('Table ' + event.tableName + ' not found, creating...');
      dynamodb.createTable(tableParams, function(err, data) {
        if (err) {
          console.log(err, err.stack);
        } else {
          // console.log(data);
          console.log('Table created');
          isTableReady(false);
        }
      });
    } else {
      // console.log(data);
      console.log('Table ' + event.tableName + ' already exists, using this table...');
      goRun();
    }
  });
};
