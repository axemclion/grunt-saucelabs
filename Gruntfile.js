module.exports = function(grunt) {
	var _browsers = [{
		browserName: 'firefox'
	}, {
		browserName: 'googlechrome',
		platform: 'linux'
	}, {
		browserName: 'firefox',
		platform: 'Windows 2003',
		version: '12'
	}, {
		browserName: 'firefox',
		platform: 'Windows 2003',
		version: '13'
	}, {
		browserName: 'firefox',
		platform: 'Windows 2003',
		version: '14'
	}, {
		browserName: 'firefox',
		platform: 'Windows 2003',
		version: '15'
	}, {
		browserName: 'internet explorer',
		platform: 'Windows 2012',
		version: '10'
	}, {
		browserName: 'opera',
		version: '11'
	}, {
		browserName: 'opera',
		version: '12'
	}];

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			files: ['grunt.js', 'tasks/**/*.js']
		},
		connect: {
			server: {
				options: {
					base: 'test',
					port: 9999
				}
			}
		},

		'saucelabs-qunit': {
			all: {
				//username: 'parashu',
				//key: '',
				urls: ['http://127.0.0.1:9999/qunit/lists-plugin.html', 'http://127.0.0.1:9999/qunit/twitter-plugin.html'],
				tunnelTimeout: 5,
				build: process.env.TRAVIS_JOB_ID,
				concurrency: 3,
				browsers: _browsers
			}
		},
		'saucelabs-jasmine': {
			all: {
				//username: 'parashu',
				//key: '',
				urls: ['http://127.0.0.1:9999/jasmine/SpecRunner.html', 'http://127.0.0.1:9999/jasmine/SpecRunnerDos.html'],
				tunnelTimeout: 5,
				build: process.env.TRAVIS_JOB_ID,
				concurrency: 3,
				browsers: _browsers
			}
		},
		watch: {

		}
	});
	grunt.loadTasks('tasks');

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('test', ['connect', 'saucelabs-qunit', 'saucelabs-jasmine']);
	grunt.registerTask('default', ['jshint', 'test']);
};