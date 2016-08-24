/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const cf = require('cf-client');
const crypto = require('crypto');

/** Refresh the auth token every 6 hours */
const TOKEN_REFRESH_PERIOD = 21600000;

const promise = new Promise((resolve, reject) => {

	// Library is designed for usage with the hubot-ibmcloud
	// family of scripts.
	// Assign required config settings.
	// - HUBOT_BLUEMIX_API - Bluemix API URL
	// - HUBOT_BLUEMIX_ORG - Bluemix Organization
	// - HUBOT_BLUEMIX_SPACE - Bluemix space
	// - HUBOT_BLUEMIX_USER - Bluemix User ID
	// - HUBOT_BLUEMIX_PASSWORD - Password for the Bluemix User
	const endpoint = process.env.HUBOT_BLUEMIX_API;
	const username = process.env.HUBOT_BLUEMIX_USER;
	var password = process.env.HUBOT_BLUEMIX_PASSWORD;
	if (process.env.HUBOT_BLUEMIX_SALT) {
		var decipher = crypto.createDecipher('aes-256-cbc', process.env.HUBOT_BLUEMIX_SALT);
		decipher.update(password, 'base64', 'utf8');
		password = decipher.final('utf8');
	}
	const orgName = process.env.HUBOT_BLUEMIX_ORG;
	const spaceName = process.env.HUBOT_BLUEMIX_SPACE;
	// Base the loggregator endpoint on the API endpoint
	const logEndpoint = (endpoint || '').replace('/api', '/loggregator');

	// ----------------------------------------------------
	// Handle initial setup: login, getting org and space
	// ----------------------------------------------------
	const CloudController = new cf.CloudController(endpoint);
	const UsersUAA = new cf.UsersUAA;
	const Apps = new cf.Apps(endpoint);
	const Orgs = new cf.Organizations(endpoint);
	const Spaces = new cf.Spaces(endpoint);
	const Services = new cf.Services(endpoint);
	const ServiceInstances = new cf.ServiceInstances(endpoint);
	const ServiceBindings = new cf.ServiceBindings(endpoint);
	const Events = new cf.Events(endpoint);
	const Logs = new cf.Logs();
	const Domains = new cf.Domains(endpoint);
	const Routes = new cf.Routes(endpoint);

	const guids = {};
	const serviceCache = [];

	var secureToken = null;

	let servicesPromise;

	// Get the login endpoint
	CloudController.getInfo().then((result) => {
		// Log into CF, returning the token needed for follow on calls to CF
		UsersUAA.setEndPoint(result.authorization_endpoint);
		return UsersUAA.login(username, password);
	}).then((result) => {

		/* Export the auth token */
		module.exports.token = result;

		// Get the list of organizations
		secureToken = result;
		// Assign the security token to the different CF components.
		UsersUAA.setToken(secureToken);
		Apps.setToken(secureToken);
		Orgs.setToken(secureToken);
		Spaces.setToken(secureToken);
		Services.setToken(secureToken);
		ServiceInstances.setToken(secureToken);
		ServiceBindings.setToken(secureToken);
		Events.setToken(secureToken);
		Logs.setToken(secureToken);
		Domains.setToken(secureToken);
		Routes.setToken(secureToken);

		Logs.setEndPoint(logEndpoint);

		// Get the list of services
		servicesPromise = buildServiceCache(Services, serviceCache);

		// Get a list of all the user's organizations.
		return Orgs.getOrganizations();
	}).then((result) => {
		// Find the specific organization.
		const found = result.resources.some((org) => {
			if (org.entity.name === orgName) {
				guids.org = org.metadata.guid;
				return true;
			}
		});
		if (!found) {
			throw new Error('Org was not found.');
		}
		// Get the org summary
		return Orgs.getSummary(guids.org);
	}).then((result) => {
		// Find the space within the org summary.
		const found = result.spaces.some((space) => {
			if (space.name === spaceName) {
				guids.space = space.guid;
				return true;
			}
		});
		if (!found) {
			throw new Error('Space not found');
		}

		const done = () => resolve(module.exports);
		servicesPromise.then(done, done);

		return Spaces.getSummary(guids.space);
	}).catch((reason) => {
		reject(new Error(reason));
		console.error('Error: ' + reason);
	});

	/*
	 * Returns active space.  If invoked in context of hubot native adapters supporting the notion of user, then the space
	 * will be specific to each user.
	 */
	function activeSpace(robot, res) {
		let space = {name: spaceName, guid: guids.space};
		if (robot && res && res.message && res.message.user && res.message.user.id) {
			const pref = robot.brain.get(res.message.user.id);
			if (pref && pref.space) {
				space = pref.space;
			}
		}
		return space;
	}

	Apps.getApp = getApp;

	module.exports.Orgs = Orgs;
	module.exports.Spaces = Spaces;
	module.exports.Services = Services;
	module.exports.ServiceInstances = ServiceInstances;
	module.exports.ServiceBindings = ServiceBindings;
	module.exports.Events = Events;
	module.exports.Logs = Logs;
	module.exports.Apps = Apps;
	module.exports.guids = guids;
	module.exports.serviceCache = serviceCache;
	module.exports.activeSpace = activeSpace;
	module.exports.Domains = Domains;
	module.exports.Routes = Routes;

	stayAlive(UsersUAA);
});

/**
 * For a given name, returns the instance of the app matching that name filtered down by the space, if specified
 * @param {string} name the name of the app
 * @param {string} [space] the space guid to filter by
 * @returns {Promise} When the space guid is specified, resolves with a single instance of the app or undefined if one cannot be found by that name; otherwise, resolves with an array of app instances
 */
function getApp(name, space) {
	return new Promise((resolve, reject) => {
		module.exports.Apps.getApps({q: `name:${name}` + (space ? `;space_guid:${space}` : '')}).then((result) => {
			if (space) {
				resolve(result.resources[0]);
			}
			else {
				resolve(result.resources);
			}
		}, reject);
	});
}

/**
 * Pull the full list of services from CF.  Only 100 can be pulled at a
 * time soe this function is recursive.
 */
function buildServiceCache(cfServices, cache) {
	return new Promise((resolve, reject) => {
		function getPage(page) {
			console.log(`Requesting page ${page} of all services.`);

			cfServices.getServices({'results-per-page': 100, page: page}).then((result) => {
				const serviceList = result.resources;
				serviceList.forEach((service) => {
					var displayName;
					var documentationUrl;
					if (service.entity.extra) {
						const extra = JSON.parse(service.entity.extra);
						displayName = extra.displayName;
						documentationUrl = extra.documentationUrl;
					}
					cache.push({
						guid: service.metadata.guid,
						description: service.entity.description,
						label: service.entity.label,
						display_name: displayName || service.entity.label,
						doc_url: documentationUrl || null,
						deprecated: Array.isArray(service.entity.tags) && service.entity.tags.indexOf('ibm_deprecated') > -1
					});
				});

				if (page === result.total_pages) {
					// At the end, resolve with the cache
					resolve(cache.sort((l, r) => l.label.localeCompare(r.label)));
				}
				else {
					// There are more pages to retrieve
					getPage(++page);
				}
			}, reject);
		};
		getPage(1);
	});
}

/**
 * Get the GUID of a service, given its name.  Return null if not found.
 */
function getServiceGuid(serviceName) {
	for (let i = 0; i < this.serviceCache.length; i++) {
		if (this.serviceCache[i].label === serviceName || this.serviceCache[i].display_name === serviceName) {
			return this.serviceCache[i].guid;
		}
	}
}

/**
 * Keep the hubot connection to bluemix alive.
 * @param {UsersUAA} uaa Cloud Foundry UAA manager
 */
function stayAlive(uaa) {
	setInterval(() => {
		// Ah, ha, ha, ha, stayin' alive, stayin' alive
		console.log(`[${new Date()}] Challenging auth.`);
		uaa.refreshToken().then(() => {
			console.log(`[${new Date()}] Refreshed auth token... until next time.`);
		}, console.error.bind(console));
	}, TOKEN_REFRESH_PERIOD); // Challenge periodically
}

module.exports.promise = promise;
module.exports.getServiceGuid = getServiceGuid;
