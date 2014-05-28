'use strict';

var request = require('request');
var Q = require('q');

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
 * @param {String} pollId - The id used for polling the status of jobs.
 * @param {String} user - The Sauce Labs username.
 * @param {String} key - The Sauce Labs access key.
 * @param {String} framework - The unit test framework's name. Can be 'yasmine',
 *     'qunit', 'YUI Test', 'mocha' or 'custom'.
 * @param {Number} testInterval - The polling interval in milliseconds.
 */
var Job = function (pollId, user, key, framework, testInterval) {
  this.id = null;
  this.pollId = pollId;
  this.user = user;
  this.key = key;
  this.framework = framework;
  this.testInterval = testInterval;
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
    Q
      .nfcall(request.post, {
        url: ['https://saucelabs.com/rest/v1', me.user, 'js-tests/status'].join('/'),
        auth: { user: me.user, pass: me.key },
        json: { 'js tests': [me.pollId] }
      })
      .then(
        function (result) {
          var response = result[0];
          var body = result[1];

          if (response.statusCode !== 200) {
            throw ['Unexpected response from the Sauce Labs API.',
              request.method + ' ' + request.url,
              'Response status: ' + response.statusCode,
              'Response body: ' + JSON.stringify(body)].join('\n');
          }

          return body;
        },
        function (error) {
          throw 'Error connecting to api to get test status: ' + error.toString();
        }
      )
      .then(function (body) {
        if (!body.completed) {
          return Q
            .delay(me.testInterval)
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

module.exports = Job;