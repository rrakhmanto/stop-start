'use strict';
console.log('Running...');
var AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
var lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });
var functionName = 'stop-start-stop-start';

// Get all function details
// Note: does not yet handle pagination
function listFunctions() {
  console.log('Getting functions...')
  lambda.listFunctions({}, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      // console.log(data.Functions);
      checkFunctionName(data.Functions);
    }
  });
}

// Search the list of functions for the correct name
function checkFunctionName(functions) {
  console.log('Checking for function existence...')
  for (var i = 0; i < functions.length; i++) {
    if (functions[i].FunctionName === functionName) {
      invokeFunction(functions[i].FunctionName);
      return;
    }
  }
  console.log('Stop-Start function does not appear to exist, aborting...');
  process.exit(1);
}

// Invoke the function with the specified event configuration parameters
function invokeFunction(name) {
  var eventConfig = '{ "stopStart": "start", "reportOnly": false, "environment": "dev", "tableName": "stop-start", "region": "ap-southeast-2" }';
  var params = {
    FunctionName: name,
    InvocationType: 'RequestResponse',
    Payload: eventConfig
  };
  lambda.invoke(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
    }
  });
}

listFunctions();
