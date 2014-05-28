'use strict';

var _ = require('lodash');
var request = require('request');
var Q = require('q');
var scheduler = require('./promise-scheduler');
var Job = require('./Job');
var notifications = require('./notifications');

/**
 * Test runner.
 *
 * @constructor
 * @param {Object} properties - Configuration options.
 * @param {String} framework - The unit test framework's name. Can be 'yasmine', 'qunit',
 *   'YUI Test', 'mocha' or 'custom'.
 * @param {Function} onProgress - Progress handler.
 */
var TestRunner = function (properties, framework, onProgress) {
  this.user = properties.username;
  this.key = properties.key;
  this.testInterval = properties.testInterval;
  this.framework = framework;
  this.tunneled = properties.tunneled;
  this.tunnelId = properties.identifier;
  this.testName = properties.testname;
  this.build = properties.build;
  this.sauceConfig = properties.sauceConfig;
  this.onTestComplete = properties.onTestComplete;
  this.throttled = properties.throttled;
  this.browsers = properties.browsers;
  this.urls = properties.url || properties.urls;
  this.onProgress = onProgress;

  if (properties['max-duration']) {
    // max-duration is actually a sauce selenium capability
    this.sauceConfig['max-duration'] = properties['max-duration'];
  }
  this.urls = this.urls.length !== undefined ? this.urls : [this.urls];
  this.numberOfJobs = this.browsers.length * this.urls.length;
  this.startedJobs = 0;
};

/**
* Reports progress.
* @param {Object} progress - Progress data.
*/
TestRunner.prototype.reportProgress = function (progress) {
  if (this.onProgress) {
    this.onProgress(progress);
  }
};

/**
 * Runs the test in all of the browsers-URL combinations.
 *
 * @returns {Object} - A promise which will be eventually resolved with the test results
 *   (a boolean). Progress is reported after each job is started and completed.
 */
TestRunner.prototype.runTests = function () {
  var me = this;
  var throttledRunTest, promises;

  throttledRunTest = scheduler.limitConcurrency(this.runTest.bind(this), this.throttled || Number.MAX_VALUE);

  promises = this.urls
    .map(function (url) {
      return this.browsers.map(function (browser) {
        return throttledRunTest(browser, url);
      });
    }, this)
    .reduce(function (acc, promisesForUrl) {
      return acc.concat(promisesForUrl);
    }, []);

  return Q
    .all(promises)
    .then(function (results) {
      var passed = results.indexOf(false) === -1;

      me.reportProgress({
        type: notifications.testCompleted,
        passed: passed
      });

      return passed;
    });
};

/**
 * Runs a test with the specified URL in the specified environment.
 *
 * @param {Object} browser - The environment to run the test on.
 * @param {String} url - An URL that will be loaded in the browsers.
 * @returns {Object} - A promise which will be eventually resolved with the test results
 *   (a boolean). Progress is reported after the job is started and completed.
 */
TestRunner.prototype.runTest = function (browser, url) {
  var me = this;

  return this
    .startJob(browser, url)
    .then(function (job) {
      me.startedJobs += 1;
      me.reportProgress({
        type: notifications.jobStarted,
        numberOfJobs: me.numberOfJobs,
        startedJobs: me.startedJobs
      });

      return job
        .getResult()
        .then(function (result) {
          if (me.onTestComplete) {
            var clone = _.clone(result, true);
            return Q
              .fcall(me.onTestComplete, clone)
              .then(function (passed) {
                if (passed !== undefined) {
                  result.passed = !!passed;
                }
                return result;
              });
          }
          return result;
        })
        .then(function (result) {
          me.reportProgress({
            type: notifications.jobCompleted,
            url: url,
            platform: result.platform,
            passed: result.passed,
            tunnelId: me.tunnelId
          });

          return result.passed;
        });
    });
};

/**
 * Creates and starts a new Sauce Labs job.
 *
 * @param {Object} browser - The environment to run the job on.
 * @param {String} url - An URL that will be loaded in the browser.
 * @returns {Object} - A promise which will be eventually resolved with the Job instance.
 */
TestRunner.prototype.startJob = function (browser, url) {
  var me = this;
  var requestParams = {
    url: ['https://saucelabs.com/rest/v1', this.user, 'js-tests'].join('/'),
    auth: { user: this.user, pass: this.key },
    json: {
      platforms: [[browser.platform || '', browser.browserName || '', browser.version || '']],
      url: url,
      framework: this.framework,
      build: this.build,
      name: this.testname
    }
  };
  _.merge(requestParams.json, this.sauceConfig);

  if (this.tunneled) {
    requestParams.json['tunnel-identifier'] = this.tunnelId;
  }

  return Q.nfcall(request.post, requestParams)
    .then(
      function (result) {
        var response = result[0];
        var body = result[1];
        var pollIds = body['js tests'];

        if (response.statusCode !== 200) {
          throw [
            'Unexpected response from the Sauce Labs API.',
            request.method + ' ' + request.url,
            'Response status: ' + response.statusCode,
            'Body: ' + JSON.stringify(body)
          ].join('\n');
        } else if (!pollIds || !pollIds.length) {
          throw 'Error starting tests through Sauce API: ' + JSON.stringify(body);
        }

        return new Job(pollIds[0], me.user, me.key, me.framework, me.testInterval);
      },
      function (error) {
        throw 'Could not connect to Sauce Labs API: ' + error.toString();
      }
    );
};

module.exports = TestRunner;