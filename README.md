[![Build Status](https://travis-ci.org/ibm-cloud-solutions/hubot-cf-convenience.svg?branch=master)](https://travis-ci.org/ibm-cloud-solutions/hubot-cf-convenience)
[![Dependency Status](https://dependencyci.com/github/ibm-cloud-solutions/hubot-cf-convenience/badge)](https://dependencyci.com/github/ibm-cloud-solutions/hubot-cf-convenience)
[![npm](https://img.shields.io/npm/v/hubot-cf-convenience.svg?maxAge=2592000)](https://www.npmjs.com/package/hubot-cf-convenience)

# hubot-cf-convenience

Small collection of syntactic sugar convenience functions for `cf-nodejs-client`.

## Usage

This script depends on the following variables to be set in the environment:
```
HUBOT_BLUEMIX_API=<Bluemix API URL>
HUBOT_BLUEMIX_ORG=<Bluemix Organization>
HUBOT_BLUEMIX_SPACE=<Bluemix space>
HUBOT_BLUEMIX_USER=<Bluemix User ID>
HUBOT_BLUEMIX_PASSWORD=<Password for the Bluemix use>
```
You can access the primed cf with the following commands:
```
var cf = require('hubot-cf-convenience');

cf.promise.then(() => {
	// utilize cloud foundry capabilities.
});
```

## License

See [LICENSE.txt](https://github.com/ibm-cloud-solutions/hubot-cf-convenience/blob/master/LICENSE.txt) for license information.

## Contribute

Please check out our [Contribution Guidelines](https://github.com/ibm-cloud-solutions/hubot-cf-convenience/blob/master/CONTRIBUTING.md) for detailed information on how you can lend a hand.
