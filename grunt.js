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
            tunneled: false,
            tunnelTimeout: 5,
            testname: 'QUnit w/ Grunt',
            concurrency: 3,
            browsers: _browsers,
            onTestComplete: function(){
                // Called after a qunit unit is done, per page, per browser
                // Return true or false, passes or fails the test
                // Returning undefined does not alter the test result

                // For async return, call 
                var done = this.async();
                setTimeout(function(){
                    // Return to this test after 1000 milliseconds
                    done(/*true or false changes the test result, undefined does not alter the result*/);
                }, 1000);
            }
        }
    }
	});
	grunt.loadTasks('tasks');
	grunt.registerTask('test', 'server saucelabs-qunit');
	grunt.registerTask('default', 'lint test');
};
