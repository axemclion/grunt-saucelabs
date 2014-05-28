module.exports = function(grunt) {
  var Q = require('q');
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
      all: {
        src: [
          'tasks/**/*.js',
          'Gruntfile.js'
        ]
      }
    },
    connect: {
      server: {
        options: {
          base: 'test',
          port: 9999
        }
      }
    },
    jscs: {
      all: {
        src: [
          '<%= jshint.all.src %>'
        ]
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
      succeeds: {
        //username: '',
        //key: '',
        options: {
          urls: ['http://127.0.0.1:9999/custom/custom.html'],
          build: process.env.TRAVIS_JOB_ID,
          browsers: browsers,
          testname: 'saucelabs-custom:succeeds',
          sauceConfig: {
            'video-upload-on-pass': false
          }
        }
      },
      fails: {
        options: {
          urls: ['http://127.0.0.1:9999/custom/fails.html'],
          build: process.env.TRAVIS_JOB_ID,
          browsers: [{
            browserName: 'googlechrome',
            platform: 'XP'
          }],
          testname: 'saucelabs-custom:fails',
          sauceConfig: {
            'video-upload-on-pass': false
          }
        }
      },
      'callback-succeeds': {
        options: {
          urls: ['http://127.0.0.1:9999/custom/simple.html'],
          build: process.env.TRAVIS_JOB_ID,
          browsers: [{
            browserName: 'googlechrome',
            platform: 'XP'
          }],
          testname: 'saucelabs-custom:callback-succeeds',
          onTestComplete: function () { return true; },
          sauceConfig: {
            'video-upload-on-pass': false
          }
        }
      },
      'callback-async-succeeds': {
        options: {
          urls: ['http://127.0.0.1:9999/custom/simple.html'],
          build: process.env.TRAVIS_JOB_ID,
          browsers: [{
            browserName: 'googlechrome',
            platform: 'XP'
          }],
          testname: 'saucelabs-custom:callback-async-succeeds',
          onTestComplete: function () { return Q.delay(3000).thenResolve(true); },
          sauceConfig: {
            'video-upload-on-pass': false
          }
        }
      },
      'callback-fails': {
        options: {
          urls: ['http://127.0.0.1:9999/custom/simple.html'],
          build: process.env.TRAVIS_JOB_ID,
          browsers: [{
            browserName: 'googlechrome',
            platform: 'XP'
          }],
          testname: 'saucelabs-custom:callback-fails',
          onTestComplete: function () { return false; },
          sauceConfig: {
            'video-upload-on-pass': false
          }
        }
      },
      'callback-async-fails': {
        options: {
          urls: ['http://127.0.0.1:9999/custom/simple.html'],
          build: process.env.TRAVIS_JOB_ID,
          browsers: [{
            browserName: 'googlechrome',
            platform: 'XP'
          }],
          testname: 'saucelabs-custom:callback-async-fails',
          onTestComplete: function () { return Q.delay(3000).thenResolve(false); },
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

  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-jscs-checker');

  var testjobs = ['jscs', 'jshint', 'connect'];
  if (typeof process.env.SAUCE_ACCESS_KEY !== 'undefined'){
    testjobs = testjobs.concat([
      'saucelabs-qunit',
      'saucelabs-jasmine',
      'saucelabs-yui',
      'saucelabs-mocha',
      'saucelabs-custom:succeeds',
      'saucelabs-custom:callback-succeeds',
      'saucelabs-custom:callback-async-succeeds'
    ]);
  }

  grunt.registerTask("dev", ["connect", "watch"]);
  grunt.registerTask('test', testjobs);
  grunt.registerTask('default', ['test']);
};
