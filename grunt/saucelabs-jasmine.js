'use strict';

module.exports = function (grunt, options) {
  var merge = require('merge');

  return {
    succeeds: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: [
          'http://127.0.0.1:9999/jasmine/SpecRunner.html',
          'http://127.0.0.1:9999/jasmine/SpecRunnerDos.html'
        ],
        testname: 'saucelabs-jasmine:succeeds',
        throttled: 3
      })
    },
    fails: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/jasmine/fails.html'],
        testname: 'saucelabs-jasmine:fails',
        onTestComplete: options.negateResult
      })
    }
  };
};