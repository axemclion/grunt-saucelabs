'use strict';

module.exports = function (grunt, options) {
  var merge = require('merge');

  return {
    succeeds: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/qunit/index.html'],
        testname: 'saucelabs-qunit:succeeds'
      })
    },
    fails: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/qunit/fails.html'],
        testname: 'saucelabs-qunit:fails',
        onTestComplete: options.negateResult
      })
    }
  };
};