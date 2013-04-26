/*jshint browser:true */
/*global QUnit */
(function () {

/**
 * Reporter for grunt-saucelabs-qunit.
 * For efficiency we flatten module > test > assertion to only assertions,
 * and skip successful assertions.
 */

var currModule, currTest,
	results = [],
	buffer = [];

QUnit.moduleStart(function(module) {
	currModule = module.name || '';
});

QUnit.testStart(function(test) {
	currTest = test.name;
});

QUnit.log(function(assertion) {
	if (!assertion.result) {
		buffer.push({
			/** @type {string} */
			test: (currModule ? currModule + ' - ' : '') + currTest,
			/** @type {string} */
			message: assertion.message,
			/** @type {boolean} */
			result: assertion.result,
			/** @type {mixed|undefined} */
			actual: QUnit.jsDump.parse(assertion.actual),
			/** @type {mixed|undefined} */
			expected: QUnit.jsDump.parse(assertion.expected),
			/** @type {string} */
			source: assertion.source || ''
		});
	}
});

QUnit.testDone(function(test) {
	// It is important to only push the buffer if the test object
	// says there are failures. There are cases where QUnit emits
	// a 'log' event for a failed test but it is not considered
	// a failure (jquery/qunit#435).
	if (test.failed > 0) {
		results.push.apply(results, buffer);
	}
	buffer.length = 0;
});

QUnit.done(function (suite) {
	window.gruntsaucelabs_qunit_report = {
		name: document.title || location.href,
		failed: suite.failed,
		passed: suite.passed,
		total: suite.total,
		duration: suite.runtime,
		results: results
	};
});

// We disabled autostart to make sure these hooks are
// registered before the first test. Now that we're done,
// the first test may start.
// Without `QUnit.config.autostart = false` we'll miss the
// first (if not all) tests and thus get a useless report.
if (!QUnit.config.current) {
	// If this test suite starts asynchronusly, it may have
	// started already regardless of `autostart = false`.
	QUnit.start();
}

}());
