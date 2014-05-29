'use strict';

module.exports = function (grunt, options) {
  var merge = require('merge');

  return {
    all: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: [
          'http://127.0.0.1:9999/jasmine/SpecRunner.html',
          'http://127.0.0.1:9999/jasmine/SpecRunnerDos.html'
        ],
        testname: 'jasmine tests',
        throttled: 3
      })
    }
  };
};