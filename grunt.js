module.exports = function(grunt) {
	var _browsers = [
		{
			browserName: 'firefox'
		},
		{
			browserName: 'googlechrome',
			platform: 'linux'
		},
		{
			browserName: 'firefox',
			platform: 'Windows 2003',
			version: '12'
		},
		{
			browserName: 'firefox',
			platform: 'Windows 2003',
			version: '13'
		},
		{
			browserName: 'firefox',
			platform: 'Windows 2003',
			version: '14'
		},
		{
			browserName: 'firefox',
			platform: 'Windows 2003',
			version: '15'
		},
		{
			browserName: 'internet explorer',
			platform: 'Windows 2012',
			version: '10'
		},
		{
			browserName: 'opera',
			version: '11'
		},
		{
			browserName: 'opera',
			version: '12'
		}
	];

	grunt.initConfig({
		lint: {
			files: ['grunt.js', 'tasks/**/*.js']
		},
    server: {
      base: 'test',
      port: 9999
    },
    'saucelabs-qunit': {
        all: {
            urls: ['http://127.0.0.1:9999/qunit/lists-plugin.html', 'http://127.0.0.1:9999/qunit/twitter-plugin.html'],
            tunnelTimeout: 5,
            testname: 'Sauce Labs Grunt Task with QUnit',
            build: process.env.TRAVIS_JOB_ID,
            concurrency: 3,
            browsers: _browsers
        }
    },
    'saucelabs-jasmine': {
        all: {
            urls: ['http://127.0.0.1:9999/jasmine/SpecRunner.html', 'http://127.0.0.1:9999/jasmine/SpecRunnerDos.html'],
            tunnelTimeout: 5,
            testname: 'Sauce Labs Grunt Task with Jasmine',
            build: process.env.TRAVIS_JOB_ID,
            concurrency: 3,
            browsers: _browsers
        }
    }
	});
	grunt.loadTasks('tasks');
	grunt.registerTask('test', 'server saucelabs-qunit saucelabs-jasmine');
	grunt.registerTask('default', 'lint test');
};
