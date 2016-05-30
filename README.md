Temporary notes on developing:

There is a manually created function in US-East-1
All resources the function accesses are in Sydney

Workflow:

Clone the repo
Set up a sls project

Configure resources:
  Set them up in the s-resources-cf.json file, really only what access you want the function to have (policies)
Deploy resources
  sls resource deploy
Deploy function
  sls function deploy
Configure event
Deploy event



Can test run the function prior to deployment by running sls function run function/stop-start
