'use strict';
console.log('Running...');
var AWS = require('aws-sdk');
AWS.config.region = process.env.AWS_DEFAULT_REGION || 'us-east-1';
var lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });
var functionName = process.env.FUNCTION_NAME || 'stop-start-stop-start';

listFunctions();

// Get all function details
// Note: does not yet handle pagination
function listFunctions() {
  console.log('Getting functions...')
  lambda.listFunctions({}, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      // console.log(data);
      console.log('Got functions');
      checkFunctionName(data.Functions);
    }
  });
}

// Search the list of functions for the correct name
function checkFunctionName(functions) {
  console.log('Checking that the specified function exists...')
  for (var i = 0; i < functions.length; i++) {
    if (functions[i].FunctionName === functionName) {
      console.log('Found function ' + functionName);
      invokeFunction(functions[i].FunctionName);
      return;
    }
  }
  console.log('Stop-Start function does not appear to exist, aborting...');
  process.exit(1);
}

// Invoke the function with the specified event configuration parameters
function invokeFunction() {
  console.log('Invoking function ' + functionName + '...');
  var eventConfig = setLambdaVariables();
  var params = {
    FunctionName: functionName,
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

function setLambdaVariables() {
  console.log('Setting function variables...');
  var config = {};
  config.stopStart = process.env.STOP_START || 'stop';
  config.reportOnly = JSON.parse(process.env.REPORT_ONLY) || false;
  config.environment = process.env.ENVIRONMENT || 'prod';
  config.tableName = process.env.TABLE_NAME || 'stop-start';
  config.region = process.env.REGION || 'ap-southeast-2';
  console.log(config);
  return JSON.stringify(config);
}
