module.exports = function(grunt) {
	var browsers = [{
		browserName: 'firefox',
		version: '19',
		platform: 'XP'
	}, {
		browserName: 'googlechrome',
		platform: 'XP'
	}, {
		browserName: 'googlechrome',
		platform: 'linux'
	}, {
		browserName: 'internet explorer',
		platform: 'WIN8',
		version: '10'
	}, {
		browserName: 'internet explorer',
		platform: 'VISTA',
		version: '9'
	}];

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			options: {
				jshintrc: __dirname + '/.jshintrc'
			},
			files: ['bin/grunt-saucelabs-qunit',
				'tasks/**/*.js',
				'test/qunit/grunt-saucelabs-inject.js',
				'Gruntfile.js'],
		},
		connect: {
			server: {
				options: {
					base: 'test',
					port: 9999
				}
			}
		},

		'saucelabs-yui': {
			all: {
				//username: '',
				//key: '',
				options: {
					urls: ['http://127.0.0.1:9999/yui/index.html'],
					build: process.env.TRAVIS_JOB_ID,
					browsers: browsers,
					testname: "yui tests",
					sauceConfig: {
						'video-upload-on-pass': false
					}
				}
			}
		},
		'saucelabs-mocha': {
			all: {
				//username: '',
				//key: '',
				options: {
					urls: ['http://127.0.0.1:9999/mocha/test/browser/index.html'],
					build: process.env.TRAVIS_JOB_ID,
					browsers: browsers,
					testname: "mocha tests",
					sauceConfig: {
						'video-upload-on-pass': false
					}
				}
			}
		},
		'saucelabs-custom': {
			all: {
				//username: '',
				//key: '',
				options: {
					urls: ['http://127.0.0.1:9999/custom/custom.html'],
					build: process.env.TRAVIS_JOB_ID,
					browsers: browsers,
					testname: "custom tests",
					sauceConfig: {
						'video-upload-on-pass': false
					}
				}
			}
		},
		'saucelabs-qunit': {
			all: {
				//username: '',
				//key: '',
				options: {
					urls: ['http://127.0.0.1:9999/qunit/index.html'],
					build: process.env.TRAVIS_JOB_ID,
					browsers: browsers,
					testname: "qunit tests",
					sauceConfig: {
						'video-upload-on-pass': false
					}
				}
			}
		},
		'saucelabs-jasmine': {
			all: {
				//username: 'parashu',
				//key: '',
				options: {
					urls: ['http://127.0.0.1:9999/jasmine/SpecRunner.html', 'http://127.0.0.1:9999/jasmine/SpecRunnerDos.html'],
					build: process.env.TRAVIS_JOB_ID,
					browsers: browsers,
					testname: "jasmine tests",
					throttled: 3,
					sauceConfig: {
						'video-upload-on-pass': false
					}
				}
			}
		},
		watch: {}
	});

	grunt.loadTasks('tasks');

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-watch');

	var testjobs = ['jshint', 'connect'];
	if (typeof process.env.SAUCE_ACCESS_KEY !== 'undefined'){
		testjobs = testjobs.concat(['saucelabs-qunit', 'saucelabs-jasmine', 'saucelabs-yui', 'saucelabs-mocha', 'saucelabs-custom']);
	}

	grunt.registerTask("dev", ["connect", "watch"]);
	grunt.registerTask('test', testjobs);
	grunt.registerTask('default', ['test']);
};
