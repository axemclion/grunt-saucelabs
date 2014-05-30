'use strict';

module.exports = function (grunt, options) {
  var merge = require('merge');
  var Q = require('q');

  return {
    succeeds: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/custom/succeeds.html'],
        testname: 'saucelabs-custom:succeeds'
      })
    },
    fails: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/custom/fails.html'],
        testname: 'saucelabs-custom:fails',
        onTestComplete: options.negateResult
      })
    },
    'callback-succeeds': {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/custom/succeeds.html'],
        testname: 'saucelabs-custom:callback-succeeds',
        onTestComplete: function (result) { return result.passed; }
      })
    },
    'callback-async-succeeds': {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/custom/succeeds.html'],
        testname: 'saucelabs-custom:callback-async-succeeds',
        onTestComplete: function (result) { return Q.delay(3000).thenResolve(result.passed); }
      })
    },
    'throttled': {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        browsers: [
          { browserName: 'firefox', version: '19', platform: 'XP' },
          { browserName: 'googlechrome', platform: 'XP' },
          { browserName: 'googlechrome', platform: 'linux' },
          { browserName: 'internet explorer', platform: 'WIN8', version: '10' },
          { browserName: 'internet explorer', platform: 'VISTA', version: '9' }
        ],
        urls: [
          'http://127.0.0.1:9999/custom/succeeds.html',
          'http://127.0.0.1:9999/custom/succeeds2.html',
          'http://127.0.0.1:9999/custom/succeeds3.html'
        ],
        throttled: 3,
        testname: 'saucelabs-custom:throttled'
      })
    }
  };
};