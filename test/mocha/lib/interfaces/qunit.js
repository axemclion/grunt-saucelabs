
/**
 * Module dependencies.
 */

const Suite = require('../suite')
  ; const Test = require('../test')
  ; const utils = require('../utils');

/**
 * QUnit-style interface:
 *
 *     suite('Array');
 *
 *     test('#length', function(){
 *       var arr = [1,2,3];
 *       ok(arr.length == 3);
 *     });
 *
 *     test('#indexOf()', function(){
 *       var arr = [1,2,3];
 *       ok(arr.indexOf(1) == 0);
 *       ok(arr.indexOf(2) == 1);
 *       ok(arr.indexOf(3) == 2);
 *     });
 *
 *     suite('String');
 *
 *     test('#length', function(){
 *       ok('foo'.length == 3);
 *     });
 *
 */

module.exports = function(suite) {
  const suites = [suite];

  suite.on('pre-require', function(context, file, mocha) {
    /**
     * Execute before running tests.
     */

    context.before = function(fn) {
      suites[0].beforeAll(fn);
    };

    /**
     * Execute after running tests.
     */

    context.after = function(fn) {
      suites[0].afterAll(fn);
    };

    /**
     * Execute before each test case.
     */

    context.beforeEach = function(fn) {
      suites[0].beforeEach(fn);
    };

    /**
     * Execute after each test case.
     */

    context.afterEach = function(fn) {
      suites[0].afterEach(fn);
    };

    /**
     * Describe a "suite" with the given `title`.
     */

    context.suite = function(title) {
      if (suites.length > 1) suites.shift();
      const suite = Suite.create(suites[0], title);
      suites.unshift(suite);
      return suite;
    };

    /**
     * Exclusive test-case.
     */

    context.suite.only = function(title, fn) {
      const suite = context.suite(title, fn);
      mocha.grep(suite.fullTitle());
    };

    /**
     * Describe a specification or test-case
     * with the given `title` and callback `fn`
     * acting as a thunk.
     */

    context.test = function(title, fn) {
      const test = new Test(title, fn);
      suites[0].addTest(test);
      return test;
    };

    /**
     * Exclusive test-case.
     */

    context.test.only = function(title, fn) {
      const test = context.test(title, fn);
      const reString = '^' + utils.escapeRegexp(test.fullTitle()) + '$';
      mocha.grep(new RegExp(reString));
    };

    /**
     * Pending test case.
     */

    context.test.skip = function(title) {
      context.test(title);
    };
  });
};
