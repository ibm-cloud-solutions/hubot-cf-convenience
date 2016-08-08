/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const expect = require('chai').expect;
const mockUtils = require('./mock.utils.cf.js');
mockUtils.setupMockery();

// Leverage rewire to gain access to internal functions.
const rewire = require('rewire');

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Test CF Convenience', function() {

	let cf;
	let cfRewire;

	before(function() {
		cf = require('../cf.js');
		cfRewire = rewire('../cf.js');
		return;
	});

	context('initialize cf with promise', function() {
		it('should complete and have initialized objects', function(done) {
			let testDone = done;
			cf.promise.then(() => {
				expect(cf).to.have.property('Orgs');
				expect(cf).to.have.property('Apps');
				expect(cf).to.have.property('Spaces');
				expect(cf).to.have.property('Services');
				expect(cf).to.have.property('ServiceInstances');
				testDone();
			});
		});
	});

	context('Get service guid', function() {
		it('should not to get a guid', function(done) {
			let testDone = done;
			cf.promise.then(() => {
				let guid = cf.getServiceGuid('foo');
				expect(guid).to.be.undefined;
				testDone();
			});
		});

		it('should get a guid', function(done) {
			let testDone = done;
			cf.promise.then(() => {
				let guid = cf.getServiceGuid('validService1');
				expect(guid).to.be.a.string;
				testDone();
			});
		});

		it('should get service by display name', function(done) {
			let testDone = done;
			cf.promise.then(() => {
				let guid = cf.getServiceGuid('A ValidService2 Display Name');
				expect(guid).to.be.a.string;
				testDone();
			});
		});

		it('should get the active space', function(done) {
			let testDone = done;
			cf.promise.then(() => {
				let res = {
					message: {
						user: {
							id: '12345'
						}
					}
				}
				let robot = {
					brain: {
						get: function(id) {
							return {space: 'testSpace'};
						}
					}
				};
				let active = cf.activeSpace(robot, res);
				expect(active).to.be.a.string;
				testDone();
			}).catch((err) => {
				console.log(err);
			});
		});
	});

	context('Validate service data', function() {
		it('should detect deprecated services', function(done) {
			let testDone = done;
			cf.promise.then((result) => {
				let service1, service2;
				result.serviceCache.forEach((service) => {
					if(service.guid === 'validService1Guid') {
						service1 = service;
					}
					else if(service.guid === 'validService2Guid') {
						service2 = service;
					}
				});
				expect(service1).to.be.a.object;
				expect(service2).to.be.a.object;
				expect(service1.deprecated).to.be.false;
				expect(service2.deprecated).to.be.true;
				testDone();
			});
		});
	});

	context('rewire test', function() {
		it('should execute getApp', function(done) {
			let testDone = done;
			cf.promise.then(() => {
				let result = cfRewire.__get__('getApp')('testApp2Name','space');
				expect(result).to.be.a('promise');
				testDone();
			});
		});
	});


});
