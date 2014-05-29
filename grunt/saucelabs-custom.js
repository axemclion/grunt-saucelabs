'use strict';

module.exports = function (grunt, options) {
  var merge = require('merge');
  var Q = require('q');

  return {
    succeeds: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/custom/custom.html'],
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
        urls: ['http://127.0.0.1:9999/custom/simple.html'],
        testname: 'saucelabs-custom:callback-succeeds',
        onTestComplete: function (result) { return result.passed; }
      })
    },
    'callback-async-succeeds': {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/custom/simple.html'],
        testname: 'saucelabs-custom:callback-async-succeeds',
        onTestComplete: function (result) { return Q.delay(3000).thenResolve(result.passed); }
      })
    }
  };
};