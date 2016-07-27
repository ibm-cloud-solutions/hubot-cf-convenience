# hubot-cf-convenience

Small collection of syntactic sugar convenience functions for `cf-nodejs-client`.

## Usage <a id="usage"></a>

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

See [LICENSE.txt](./LICENSE.txt) for license information.

## Contribute

Please check out our [Contribution Guidelines](./CONTRIBUTING.md) for detailed information on how you can lend a hand.
