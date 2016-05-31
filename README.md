Stop-Start - scheduling stopping and starting of instances
==========================================================

OVERVIEW
--------

This project enables the automated stopping and starting of instances in an AWS account, primarily according to the environment type specified. It will handle all instaces for the specified environment in an AWS account whether they are in an auto scaling group or standing on their own. For the ASGs their size details are set and cleared according to whether a start or stop command is issued, data is kept about their sizing details in a DynamoDB database.

The AWS Serverless framework is used for deployment, more details can be found here: http://docs.serverless.com/v0.5.0/docs

DEPLOYING
---------

Please ensure that Node (v5.10.1+) and NPM (v3.8.6+) are installed.

### Getting Started - a typical workflow

First the Serverless environment will need to be installed:

`npm install serverless -g`

Verify a successful install by running `serverless` or `sls` for short to display the list of commands, the version should be v0.5.3 or later.

Then clone the repo and change directory into the stop-start folder:

```
git clone https://github.com/base2Services/start-stop
cd stop-start
```

Set up the Serverless project (see http://docs.serverless.com/docs/project-init for mroe details):

`serverless project init`

Configure Cloudformation resources: a basic set of resources exists to allow the functon to run against the instances in EC2, located in the s-resources-cf.json file. These can be reconfigured if need be prior to deploying. Any additional resoureces that are to be included can also go into this file.

Deploy the configured resources:

`sls resources deploy`

Deploy the function:

`sls function deploy`

Configure the desired Cloudwatch events - one or more are needed. These are in placed in the functions/stop-start/s-function.json file and are of the following format:

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
    }s
  }
}
```

Generally these will need to be configured in pairs: one to stop the instances and one to start the instances. Add these chunks of JSON accordingly separated by commas. Note the following parameters that will need to be configured:

* `name`: choose whatever you want here
* `type`: leave this as-is
* `config`: details about the event
  * `enabled`: whether or not the event is to run
  * `schedule`: can use either the rate(...) format or a valid cron expression
  * `input`: the parameters that get passed to the function
    * `stopStart`: either stop or start depending on which operation is to be performed
    * `reportOnly`: generates a list of instances that exist for the environment but will not start/stop them or record their details
    * `environment`: the tag name of the environment that the ASGs/instances belong to, this needs to be set up as tags against these resources prior to deployment of said resources
    * `tableName`: the DynamoDB table name to use, the function will set up a table if one does not exist
    * `region`: the region that the function is to target, if more than one region is needed then a function per region will need to be deployed

#### IMPORTANT - the first operation type to be perfomred in an environment needs to be a stop operation, this ensures that the database records all sizing information prior to making modifications to the ASGs. Do not attempt to perform a start operation first.

Deploy the events (final step):

`sls event deploy`

Note one can also deploy the function and events together by running the interactive Serverless console:

`serverless dash deploy`

AUTHOR
------

Michael Kempster - initial work - Base2Services

m.kempster@base2services.com
