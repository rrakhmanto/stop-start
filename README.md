Stop-Start - scheduling stoping and starting of instances
=========================================================

OVERVIEW
--------

This project enables the automated stopping and starting of instances in an AWS account, primarily according to the environment type specified. It will handle all instaces for the specified environment in an AWS account whether they are in an auto scaling group or on their own. For the ASGs their size details are set and cleared according to whether a start or stop command is issued, data is kept about their sizing details in a DynamoDB database.

DEPLOYING
---------

Please ensure you have Node and NPM installed, versions???

### Getting Started - a typical workflow

First the Serverless environment will need to be installed:

`npm install serverless -g`

Then clone the repo and change directory into the stop-start folder:

```
git clone https://github.com/base2Services/start-stop:
cd stop-start
```

Set up the Serverless project:

`serverless project init???`

Configure resources:

Set them up in the s-resources-cf.json file, really only what access you want the function to have (policies)

Deploy the configured resources:

`sls resources deploy`

Deploy the function:

`sls function deploy`

Configure the desired events - one or more are needed. These are in the functions/stop-start/s-function.json file and are of the following format:

```
{
  "name": "stop-prod",
  "type": "schedule",
  "config": {
    "enabled": true,
    "description": "Event to invoke the function to stop all instances each week night",
    "schedule": "cron(0 18 ? * MON-FRI *)",
    "input": {
      "stopStart": "stop",
      "reportOnly": false,
      "environment": "prod",
      "tableName": "stop-start",
      "region": "ap-southeast-2"
    }
  }
}
```

Note the following parameters that will need to be configured:



Deploy the events:

`sls event deploy`

Note one can also deploy the function and events together by running the interactive Serverless console:

`serverless dash deploy`

AUTHOR
------

Michael Kempster - initial work - Base2Services

m.kempster@base2services.com
