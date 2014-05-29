'use strict';

module.exports = function (grunt, options) {
  var merge = require('merge');

  return {
    succeeds: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/yui/index.html'],
        testname: 'saucelabs-yui:succeeds'
      })
    },
    fails: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/yui/fails.html'],
        testname: 'saucelabs-yui:fails',
        onTestComplete: options.negateResult
      })
    }
  };
};