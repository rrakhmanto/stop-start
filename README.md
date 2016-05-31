
Workflow:

Clone the repo and cd into the stop-start dir
Set up a sls project
  serverless project init???
Configure resources:
  Set them up in the s-resources-cf.json file, really only what access you want the function to have (policies)
Deploy resources
  sls resources deploy
Deploy function
  sls function deploy
Configure events - one or more needed
Deploy event
  sls event deploy



Can test run the function prior to deployment by running sls function run function/stop-start
