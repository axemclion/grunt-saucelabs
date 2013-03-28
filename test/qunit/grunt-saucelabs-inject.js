/*jshint browser:true */
/*global QUnit */
(function () {

	/**
	 * Reporter for grunt-saucelabs-qunit.
	 * For efficiency we flatten module > test > assertion to only assertions,
	 * and skip successful assertions.
	 */

	var currModule, currTest,
		results = [];

	QUnit.moduleStart(function(module) {
		currModule = module.name || '';
	});

	QUnit.testStart(function(test) {
		currTest = test.name;
	});

	QUnit.log(function(assertion) {
		if (!assertion.result) {
			results.push({
				/** @type {string} */
				test: (currModule ? currModule + ' - ' : '') + currTest,
				/** @type {string} */
				message: assertion.message,
				/** @type {boolean} */
				result: !!assertion.result,
				/** @type {mixed|undefined} */
				actual: QUnit.jsDump.parse(assertion.actual),
				/** @type {mixed|undefined} */
				expected: QUnit.jsDump.parse(assertion.expected),
				/** @type {string} */
				source: assertion.source || ''
			});
		}
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

}());
