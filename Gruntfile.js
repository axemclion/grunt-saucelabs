'use strict';

module.exports = function (grunt) {
  var Q = require('q');
  var request = require('request');
  var tunnelId = Math.floor((new Date()).getTime() / 1000 - 1230768000).toString();

  var negateResult = function (result, callback) {
    // Reverses the job's passed status. Can be used as the onTestComplete callback for
    //the  negative tests.
    return Q.nfcall(request.put, {
      url: [
        'https://saucelabs.com/rest/v1',
        process.env.SAUCE_USERNAME,
        'jobs',
        result.job_id
      ].join('/'),
      auth: { user: process.env.SAUCE_USERNAME, pass: process.env.SAUCE_ACCESS_KEY },
      json: { passed: !result.passed }
    })
    .then(function (resp) {
      var response = resp[0];
      var body = resp[1];
      var error;

      if (response.statusCode !== 200) {
        error = [
          'Unexpected response from the Sauce Labs API.',
          request.method + ' ' + request.url,
          'Response status: ' + response.statusCode,
          'Response body: ' + JSON.stringify(body)
        ].join('\n');
        grunt.log.error(error);
        throw error;
      }

      return !result.passed;
    })
    .nodeify(callback);
  };

  grunt.task.loadTasks('tasks');

  require('load-grunt-config')(grunt, {
    data: {
      srcFiles: ['tasks/**/*.js', 'src/**/*.js', 'Gruntfile.js'],
      negateResult: negateResult,
      tunnelId: tunnelId,
      baseSaucelabsTaskOptions: {
        build: process.env.TRAVIS_JOB_ID,
        browsers: [{
          browserName: 'googlechrome',
          platform: 'XP'
        }],
        tunneled: false,
        sauceConfig: {
          'video-upload-on-pass': false,
          'tunnel-identifier': tunnelId
        }
      }
    }
  });
};
