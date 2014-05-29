'use strict';

module.exports = function (grunt, options) {
  var merge = require('merge');

  return {
    all: {
      options: merge(true, {}, options.baseSaucelabsTaskOptions, {
        urls: ['http://127.0.0.1:9999/mocha/test/browser/index.html'],
        testname: 'mocha tests'
      })
    }
  };
};