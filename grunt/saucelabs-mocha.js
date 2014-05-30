'use strict';

module.exports = function (grunt, options) {
  var merge = require('merge');

  return {
    succeeds: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/mocha/test/browser/index.html'],
        testname: 'saucelabs-mocha:succeeds'
      })
    },
    fails: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/mocha/test/browser/fails.html'],
        testname: 'saucelabs-mocha:fails',
        onTestComplete: options.negateResult
      })
    }
  };
};