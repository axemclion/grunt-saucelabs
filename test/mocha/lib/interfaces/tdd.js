
/**
 * Module dependencies.
 */

const Suite = require('../suite')
  ; const Test = require('../test')
  ; const utils = require('../utils'); ;

/**
 * TDD-style interface:
 *
 *      suite('Array', function(){
 *        suite('#indexOf()', function(){
 *          suiteSetup(function(){
 *
 *          });
 *
 *          test('should return -1 when not present', function(){
 *
 *          });
 *
 *          test('should return the index when present', function(){
 *
 *          });
 *
 *          suiteTeardown(function(){
 *
 *          });
 *        });
 *      });
 *
 */

module.exports = function(suite) {
  const suites = [suite];

  suite.on('pre-require', function(context, file, mocha) {
    /**
     * Execute before each test case.
     */

    context.setup = function(fn) {
      suites[0].beforeEach(fn);
    };

    /**
     * Execute after each test case.
     */

    context.teardown = function(fn) {
      suites[0].afterEach(fn);
    };

    /**
     * Execute before the suite.
     */

    context.suiteSetup = function(fn) {
      suites[0].beforeAll(fn);
    };

    /**
     * Execute after the suite.
     */

    context.suiteTeardown = function(fn) {
      suites[0].afterAll(fn);
    };

    /**
     * Describe a "suite" with the given `title`
     * and callback `fn` containing nested suites
     * and/or tests.
     */

    context.suite = function(title, fn) {
      const suite = Suite.create(suites[0], title);
      suites.unshift(suite);
      fn.call(suite);
      suites.shift();
      return suite;
    };

    /**
     * Pending suite.
     */
    context.suite.skip = function(title, fn) {
      const suite = Suite.create(suites[0], title);
      suite.pending = true;
      suites.unshift(suite);
      fn.call(suite);
      suites.shift();
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
      const suite = suites[0];
      if (suite.pending) var fn = null;
      const test = new Test(title, fn);
      suite.addTest(test);
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
