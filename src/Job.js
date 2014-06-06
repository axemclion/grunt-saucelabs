'use strict';

var Q = require('q');
var _ = require('lodash');
var utils = require('./utils');

//these result parsers return true if the tests all passed
var resultParsers = {
  jasmine: function (result) {
    return result.passed;
  },
  qunit: function (result) {
    return result.passed === result.total;
  },
  mocha: function (result) {
    return result.failures === 0;
  },
  'YUI Test': function (result) {
    return result.passed === result.total;
  },
  custom: function (result) {
    return result.failed === 0;
  }
};

/**
 * Represents a Sauce Labs job.
 *
 * @constructor
 * @param {String} user - The Sauce Labs username.
 * @param {String} key - The Sauce Labs access key.
 * @param {String} framework - The unit test framework's name. Can be 'jasmine',
 *   'qunit', 'YUI Test', 'mocha' or 'custom'.
 * @param {Number} pollInterval - The polling interval in milliseconds.
 * @param {String} url - The test runner page's URL.
 * @param {Object} browser - Object describing the platform to run the test on.
 * @param {String} build - Build ID.
 * @param {String} testName -  The name of this test, displayed on the Sauce Labs
 *   dashboard.
 * @param {Object} sauceConfig - Map of extra parameters to be passed to Sauce Labs.
 * @param {Boolean} tunneled - Does the test runs on a tunnel?
 * @param {String} tunnelId - Tunnel ID.
 */
var Job = function (user, key, framework, pollInterval, url, browser, build, testName,
  sauceConfig, tunneled, tunnelId) {
  this.id = null;
  this.taskId = null;
  this.user = user;
  this.key = key;
  this.framework = framework;
  this.pollInterval = pollInterval;
  this.url = url;
  this.platform = [browser.platform || '', browser.browserName || '', browser.version || ''];
  this.build = build;
  this.testName = testName;
  this.sauceConfig = sauceConfig;
  this.tunneled = tunneled;
  this.tunnelId = tunnelId;
};

/**
 * Starts the job.
 *
 * @returns {Object} - A promise which will eventually be resolved after the job has been
 * started.
 */
Job.prototype.start = function () {
  var me = this;
  var requestParams = {
    method: 'POST',
    url: ['https://saucelabs.com/rest/v1', this.user, 'js-tests'].join('/'),
    auth: { user: this.user, pass: this.key },
    json: {
      platforms: [this.platform],
      url: this.url,
      framework: this.framework,
      build: this.build,
      name: this.testName
    }
  };
  _.merge(requestParams.json, this.sauceConfig);

  if (this.tunneled) {
    requestParams.json['tunnel-identifier'] = this.tunnelId;
  }

  this.id = null;
  this.taskId = null;

  return utils
    .makeRequest(requestParams)
    .then(function (body) {
      var taskIds = body['js tests'];

      if (!taskIds || !taskIds.length) {
        throw 'Error starting tests through Sauce API: ' + JSON.stringify(body);
      }

      me.taskId = taskIds[0];
    });
};

/**
 * Returns the job result.
 *
 * @returns {Object} - A promise which will eventually be resolved with the job results.
 */
Job.prototype.getResult = function () {
  var me = this;

  return this
    .complete()
    .then(function (result) {
      if (result.status === 'test error') {
        // A detailed error message should be composed here after the Sauce Labs API is
        // modified to report errors better, see #102.
        throw 'Test Error';
      }

      /*jshint camelcase:false*/
      me.id = result.job_id;
      /*jshint camelcase:true*/

      return result;
    })
    .then(function (result) {
      result.passed = resultParsers[me.framework](result.result);
      return result;
    });
};

/**
 * Waits until the job is completed.
 *
 * @returns {Object} - A promise which will be resolved with the job's result object.
 */
Job.prototype.complete = function () {
  var me = this;
  var deferred = Q.defer();

  function fetch() {
    utils
      .makeRequest({
        method: 'POST',
        url: ['https://saucelabs.com/rest/v1', me.user, 'js-tests/status'].join('/'),
        auth: { user: me.user, pass: me.key },
        json: { 'js tests': [me.taskId] }
      })
      .then(function (body) {
        if (!body.completed) {
          return Q
            .delay(me.pollInterval)
            .then(fetch);
        }

        deferred.resolve(body['js tests'][0]);
      })
      .fail(function (error) {
        deferred.reject(error);
      })
      .done();
  }

  fetch();

  return deferred.promise;
};

/**
 * Stops the job.
 *
 * @returns {Object} - A promise which will eventually be resolved after the job has been
 *   stopped.
 */
Job.prototype.stop = function () {
  return utils.makeRequest({
    method: 'PUT',
    url: ['https://saucelabs.com/rest/v1', this.user, 'jobs', this.id, 'stop' ].join('/'),
    auth: { user: this.user, pass: this.key }
  });
};

/**
 * Updates the job's attributes.
 *
 * @param {Object} attributes - The attributes to update.
 * @returns {Object} - A promise which will eventually be resolved after the job has been
 *   updated.
 */
Job.prototype.update = function (attributes) {
  return utils.makeRequest({
    method: 'PUT',
    url: ['https://saucelabs.com/rest/v1', this.user, 'jobs', this.id].join('/'),
    auth: { user: this.user, pass: this.key },
    json: attributes
  });
};

module.exports = Job;