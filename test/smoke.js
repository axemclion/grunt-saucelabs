'use strict';

// Smoke test: verify the grunt plugin and its dependencies load correctly.
// These tests run without Sauce Labs credentials and without a real grunt instance.
// Goal: catch broken imports or major API breakage from dependency updates.

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var passed = 0;
var failed = 0;

function ok(label) {
  console.log('  ok  ' + label);
  passed++;
}

function fail(label, err) {
  console.error('  FAIL ' + label + ': ' + (err && err.message || err));
  failed++;
}

// ---------------------------------------------------------------------------
// Test 1: WrapperError loads and works as a plain module (no grunt required)
// ---------------------------------------------------------------------------
try {
  var WrapperError = require('../src/WrapperError');
  assert.ok(typeof WrapperError === 'function', 'WrapperError should be a constructor');
  var e = new WrapperError('test', new Error('inner'));
  assert.ok(e instanceof Error, 'WrapperError instance should be instanceof Error');
  assert.strictEqual(e.message, 'test');
  ok('WrapperError loads and instantiates correctly');
} catch (e) {
  fail('WrapperError', e);
}

// ---------------------------------------------------------------------------
// Test 2: All source files exist and are syntactically valid JS
//         (require with a mock grunt catches syntax errors and missing deps)
// ---------------------------------------------------------------------------
var mockGrunt = {
  log: {
    writeln: function () {},
    ok: function () {},
    error: function () {},
    subhead: function () {}
  },
  verbose: {
    writeln: function () {}
  },
  registerMultiTask: function () {}
};

try {
  var utilsFactory = require('../src/utils');
  assert.ok(typeof utilsFactory === 'function', 'utils should export a factory function');
  var utils = utilsFactory(mockGrunt);
  assert.ok(typeof utils.limitConcurrency === 'function', 'utils.limitConcurrency should be a function');
  assert.ok(typeof utils.makeRequest === 'function', 'utils.makeRequest should be a function');
  ok('src/utils.js loads and exports expected API');
} catch (e) {
  fail('src/utils.js', e);
}

try {
  var jobFactory = require('../src/Job');
  assert.ok(typeof jobFactory === 'function', 'Job should export a factory function');
  var Job = jobFactory(mockGrunt);
  assert.ok(typeof Job === 'function', 'Job factory should return a constructor');
  ok('src/Job.js loads and exports expected API');
} catch (e) {
  fail('src/Job.js', e);
}

try {
  var testRunnerFactory = require('../src/TestRunner');
  assert.ok(typeof testRunnerFactory === 'function', 'TestRunner should export a factory function');
  var TestRunner = testRunnerFactory(mockGrunt);
  assert.ok(typeof TestRunner === 'function', 'TestRunner factory should return a constructor');
  assert.ok(typeof TestRunner.prototype.runTests === 'function', 'TestRunner should have runTests method');
  assert.ok(typeof TestRunner.prototype.runTest === 'function', 'TestRunner should have runTest method');
  ok('src/TestRunner.js loads and exports expected API');
} catch (e) {
  fail('src/TestRunner.js', e);
}

// ---------------------------------------------------------------------------
// Test 3: tasks/saucelabs.js has the right structure (static file check)
// ---------------------------------------------------------------------------
try {
  var taskSrc = fs.readFileSync(path.join(__dirname, '..', 'tasks', 'saucelabs.js'), 'utf8');
  assert.ok(taskSrc.includes('grunt.registerMultiTask'), 'tasks/saucelabs.js should call grunt.registerMultiTask');
  assert.ok(taskSrc.includes('module.exports'), 'tasks/saucelabs.js should use module.exports');
  // Verify the expected task names are registered
  ['saucelabs-jasmine', 'saucelabs-qunit', 'saucelabs-mocha', 'saucelabs-yui', 'saucelabs-custom'].forEach(function (task) {
    assert.ok(taskSrc.includes(task), 'tasks/saucelabs.js should register ' + task);
  });
  ok('tasks/saucelabs.js structure valid (5 task types registered)');
} catch (e) {
  fail('tasks/saucelabs.js structure', e);
}

// ---------------------------------------------------------------------------
// Test 4: Key runtime dependencies are resolvable
// ---------------------------------------------------------------------------
var deps = ['q', 'lodash', 'colors', 'requestretry', 'saucelabs', 'sauce-tunnel'];
deps.forEach(function (dep) {
  try {
    var mod = require(dep);
    assert.ok(mod, dep + ' should export something');
    ok('dependency "' + dep + '" loads');
  } catch (e) {
    fail('dependency "' + dep + '"', e);
  }
});

// ---------------------------------------------------------------------------
// Test 5: limitConcurrency utility works correctly (pure logic, no network)
// ---------------------------------------------------------------------------
try {
  var utilsForLogic = require('../src/utils')(mockGrunt);
  var Q = require('q');
  var callCount = 0;
  var concurrentCount = 0;
  var maxConcurrent = 0;

  var limitedFn = utilsForLogic.limitConcurrency(function () {
    callCount++;
    concurrentCount++;
    if (concurrentCount > maxConcurrent) { maxConcurrent = concurrentCount; }
    return Q.delay(10).then(function () {
      concurrentCount--;
      return true;
    });
  }, 2);

  Q.all([limitedFn(), limitedFn(), limitedFn(), limitedFn()])
    .then(function (results) {
      assert.strictEqual(results.length, 4, 'should get 4 results');
      assert.ok(maxConcurrent <= 2, 'concurrency should not exceed limit of 2, got ' + maxConcurrent);
      ok('limitConcurrency correctly limits concurrent executions (max=' + maxConcurrent + ')');
    })
    .catch(function (e) {
      fail('limitConcurrency logic', e);
    })
    .finally(function () {
      printSummary();
    })
    .done();
} catch (e) {
  fail('limitConcurrency setup', e);
  printSummary();
}

function printSummary() {
  console.log('\n' + passed + ' passed, ' + failed + ' failed.');
  if (failed > 0) {
    process.exit(1);
  }
}
