Stop-Start - scheduling stopping and starting of AWS EC2 instances
==================================================================

OVERVIEW
--------

This project enables the automated stopping and starting of instances in an AWS account, primarily according to the environment type specified. Motivtion for its creation was generated from the desire to automate the shut down and start up of non production accounts in order to save costs, typically it would be configured to ensure that ec2 instances in an acocunt were only running during business hours. It will handle all instaces for the specified environment in an AWS account whether they are in an auto scaling group or standing on their own. For the ASGs their size details are set and cleared according to whether a start or stop command is issued, data is kept about their sizing details in a DynamoDB database.

The AWS Serverless framework is used for deployment, more details can be found here: http://docs.serverless.com/v0.5.0/docs

DEPLOYING
---------

Please ensure that Node (v5.10.1+) and NPM (v3.8.6+) are installed. Earlier versions may work but have not been tested.

### Getting Started - a typical workflow

First the Serverless environment will need to be installed:

`npm install serverless -g`

Verify a successful install by running `serverless` or `sls` for short to display the list of commands, the version should be v0.5.3 or later.

Then clone the repo somewhere and change directory into the stop-start folder:

```
git clone https://github.com/base2Services/start-stop
cd stop-start
```

Set up the Serverless project (see http://docs.serverless.com/docs/project-init for more details):

`serverless project init`

#### A note on stages

When initialising the project - Serverless, with your input, will set up what is called a stage for you. Stages can be used for various things, typically they are used to separate production accounts from dev/test/uat acocunts. Each stage maps to a separate AWS account and these need to be configured in the user's profile under ~/.aws/. Here they can be used to separate various accounts if so desired - this is the way to manage multiple AWS accounts. When ready run the relevant Serverless deploy command (see below), you will then be prompted for the stage to use.

Configure Cloudformation resources: a basic set of resources exists to allow the functon to run against the instances in EC2, located in the s-resources-cf.json file. These can be reconfigured if need be prior to deploying but it is not mandatory to do so and can be left as-is. When initialising Serverless will automatically deploy these resources for you. Any additional resoureces that are to be included can also go into this file.

If changes are made deploy the configured resources:

`sls resources deploy`

Then deploy the function:

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

Generally these will need to be configured in pairs: one to stop the instances and one to start the instances. Add these blocks of JSON accordingly into the `"events": [ ... ]` array separated by commas. Note the following parameters that will need to be configured:

* `name`: choose whatever you want here
* `type`: leave this as-is
* `config`: details about the event
  * `enabled`: whether or not the event is to run
  * `schedule`: can use either the rate(...) format or a valid cron expression, note this is UTC time so will need to be adjusted depending on what timezone you are in
  * `input`: the parameters that get passed to the function
    * `stopStart`: either stop or start depending on which operation is to be performed
    * `reportOnly`: generates a list of instances that exist for the environment but will not start/stop them or record their details
    * `environment`: the tag name of the environment that the ASGs/instances belong to, this needs to be set up as tags against these resources prior to deployment of said resources
    * `tableName`: the DynamoDB table name to use, the function will set up a table if one does not exist
    * `region`: the region that the function is to target, if more than one region is needed then a function per region will need to be deployed

#### IMPORTANT - the first operation type to be performed in an environment needs to be a stop operation, this ensures that the database records all sizing information prior to making modifications to the ASGs. Do not attempt to perform a start operation first.

Then deploy the events (final step):

`sls event deploy`

Note one can also deploy the function and events together by running the interactive Serverless console:

`sls dash deploy`

One can also add additional stages by the command:

`sls stage create`

Note however that whenever a different stage is being worked on the Cloudwatch events will need to be reconfigured to suit, there will be an update that caters for this limitation in the future...

AUTHOR
------

Michael Kempster - initial work - Base2Services

m.kempster@base2services.com

LICENSE
-------

MIT License

Copyright (c) 2016 Michael Peter Kempster

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
