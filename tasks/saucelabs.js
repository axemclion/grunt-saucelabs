module.exports = function(grunt) {
  var _           = require('lodash'),
  rqst            = require('request'),
  SauceTunnel     = require('sauce-tunnel'),
  Q               = require('q'),
  scheduler       = require('./promise-scheduler');

  //these result parsers return true if the tests all passed
  var resultParsers = {
    jasmine: function(result){
      return result.passed;
    },
    qunit: function(result){
      if (result.passed === undefined){ return undefined; }
      return result.passed == result.total;
    },
    mocha: function(result){
      if (result.passes === undefined){ return undefined; }
      return result.failures === 0;
    },
    'YUI Test': function(result){
      if (result.passed === undefined){ return undefined; }
      return result.passed == result.total;
    },
    custom: function(result){
      if (result.passed === undefined){ return undefined; }
      return result.failed === 0;
    }
  };

  var TestResult = function(jobId, user, key, framework, testInterval){
    var url = 'https://saucelabs.com/rest/v1/' + user + '/js-tests/status';
    var deferred = Q.defer();

    var requestParams = {
      method: 'post',
      url: url,
      auth: {
        user: user,
        pass: key
      },
      json: true,
      body: {
        "js tests": [jobId]
      }
    };

    var checkStatus = function(){

      rqst(requestParams, function(error, response, body){

        if (error){
          deferred.resolve({
            passed: undefined,
            result: {
              message: "Error connecting to api to get test status: " + error.toString()
            }
          });
          return;
        }

        var testInfo = body['js tests'][0];

        if (testInfo.status == "test error"){
          deferred.resolve({
            passed: undefined,
            result: {
              message: "Test Error"
            }
          });
          return;
        }

        if (!body.completed){
          setTimeout(checkStatus ,testInterval);
        } else {
          testInfo.passed = testInfo.result ? resultParsers[framework](testInfo.result) : false;
          deferred.resolve(testInfo);
        }

      });
    };

    checkStatus();

    return deferred.promise;
  };

  var TestRunner = function(user, key, testInterval) {
    this.user = user;
    this.key = key;
    this.url = 'https://saucelabs.com/rest/v1/' + this.user + '/js-tests';
    this.testInterval = testInterval;
  };

  TestRunner.prototype.runTests = function(browsers, urls, framework, tunnelIdentifier, testname, tags, build, onTestComplete, throttled, callback){

    var me = this;
    var numberOfJobs = browsers.length * urls.length;
    var startedJobs = 0;

    function take(url, browser) {
        return me.runTest(browser, url, framework, tunnelIdentifier, testname, tags, build)
            .then(function (taskId) {

                startedJobs += 1;
                grunt.log.writeln("\n",startedJobs, "/", numberOfJobs, 'tests started');

                return TestResult(taskId, me.user, me.key, framework, me.testInterval)
                    .then(function (result) {
                        var alteredResult = onTestComplete(result);
                        if (alteredResult !== undefined) {
                            result.passed = alteredResult;
                        }

                        grunt.log.subhead("\nTested %s", url);
                        grunt.log.writeln("Platform: %s", result.platform);

                        if (tunnelIdentifier && unsupportedPort(url)) {
                            grunt.log.writeln("Warning: This url might use a port that is not proxied by Sauce Connect.".yellow);
                        }

                        if (result.passed === undefined) {
                            grunt.log.error(result.result.message);
                        } else {
                            grunt.log.writeln("Passed: %s", result.passed);
                        }
                        grunt.log.writeln("Url %s", result.url);

                        return result;
                    }, function (e) {
                        grunt.log.error('some error? %s', e);
                    });
            });
    }

    var throttledTake = scheduler.limitConcurrency(take, throttled || Number.MAX_VALUE);
    var promises = urls
        .map(function (url) {
            return browsers.map(function (browser) {
                return throttledTake(url, browser);
            });
        })
        .reduce(function (acc, promisesForUrl) {
            return acc.concat(promisesForUrl);
        }, []);

    Q.all(promises)
        .then(function (results) {
            results = results.map(function (result) {
                return result.passed;
            });

            callback(results);
        })
        .done();
  };

  TestRunner.prototype.runTest = function(browser, url, framework, tunnelIdentifier, build, testname, sauceConfig){

    var requestParams = {
      method: 'post',
      url: this.url,
      auth: {
        user: this.user,
        pass: this.key
      },
      json: true,
      body: {
        platforms: [[browser.platform || "", browser.browserName || "", browser.version || ""]],
        url: url,
        framework: framework,
        build: build,
        name: testname
      }
    };
    _.merge(requestParams.body, sauceConfig);

    if (tunnelIdentifier){
      requestParams.body['tunnel-identifier'] = tunnelIdentifier;
    }

    return Q.nfcall(rqst, requestParams)
      .then(
        function (result) {
          var body = result[1],
            taskIds = body['js tests'];

          if (!taskIds || !taskIds.length){
            grunt.log.error('Error starting tests through Sauce API: %s', JSON.stringify(body));
            throw new Error('Could not start tests through Sauce API');
          }

          return taskIds[0];
        },
        function (error) {
          grunt.log.error("Could not connect to Sauce Labs api: %s", error);
          throw error;
        }
      );
  };

  var defaultsObj = {
    username: process.env.SAUCE_USERNAME,
    key: process.env.SAUCE_ACCESS_KEY,
    identifier: Math.floor((new Date()).getTime() / 1000 - 1230768000).toString(),
    tunneled: true,
    testInterval: 1000 * 2,
    testReadyTimeout: 1000 * 5,
    onTestComplete: _.noop,
    testname: "",
    browsers: [{}],
    tunnelArgs: [],
    sauceConfig: {}
  };

  function defaults(data) {
    var result = data;
    result.pages = result.url || result.urls;
    if (!_.isArray(result.pages)) {
      result.pages = [result.pages];
    }

    return result;
  }

  function configureLogEvents(tunnel) {
    var methods = ['write', 'writeln', 'error', 'ok', 'debug'];
    methods.forEach(function (method) {
      tunnel.on('log:'+method, function (text) {
        grunt.log[method](text);
      });
      tunnel.on('verbose:'+method, function (text) {
        grunt.verbose[method](text);
      });
    });
  }

  function runTask(arg, framework, callback){

    var test = new TestRunner(arg.username, arg.key, arg.testInterval);

    //max-duration is actually a sauce selenium capability
    if (arg['max-duration']){
      arg.sauceConfig['max-duration'] = arg['max-duration'];
    }

    if (arg.tunneled){
      var tunnel = new SauceTunnel(arg.username, arg.key, arg.identifier, arg.tunneled, ['-P', '0'].concat(arg.tunnelArgs));
      grunt.log.writeln("=> Starting Tunnel to Sauce Labs".inverse.bold);
      configureLogEvents(tunnel);

      tunnel.start(function(isCreated) {
        if (!isCreated) {
          grunt.log.error("Could not create tunnel to Sauce Labs");
          callback(false);
          return;
        }
        grunt.log.ok("Connected to Saucelabs");

        test.runTests(arg.browsers, arg.pages, framework, arg.identifier, arg.build, arg.testname, arg.sauceConfig, arg.onTestComplete, arg.throttled, function (status){
          status = status.every(function(passed){ return passed; });
          grunt.log[status ? 'ok' : 'error']("All tests completed with status %s", status);
          grunt.log.writeln("=> Stopping Tunnel to Sauce Labs".inverse.bold);
          tunnel.stop(function() {
            callback(status);
          });
        });
      });

    } else {
      test.runTests(arg.browsers, arg.pages, framework, null, arg.build, arg.testname, arg.sauceConfig, arg.onTestComplete, arg.throttled, function(status){
        status = status.every(function(passed){ return passed; });
        grunt.log[status ? 'ok' : 'error']("All tests completed with status %s", status);
        callback(status);
      });
    }
  }

  function unsupportedPort(url) {
    // Not all ports are proxied by Sauce Connect. List of supported ports is
    // available at https://saucelabs.com/docs/connect#localhost
    var portRegExp = /:(\d+)\//;
    var matches = portRegExp.exec(url);
    var port = matches ? parseInt(matches[1], 10) : null;
    var supportedPorts = [80, 443, 888, 2000, 2001, 2020, 2109, 2222, 2310, 3000, 3001, 3030,
      3210, 3333, 4000, 4001, 4040, 4321, 4502, 4503, 4567, 5000, 5001, 5050, 5555, 5432, 6000,
      6001, 6060, 6666, 6543, 7000, 7070, 7774, 7777, 8000, 8001, 8003, 8031, 8080, 8081, 8765,
      8888, 9000, 9001, 9080, 9090, 9876, 9877, 9999, 49221, 55001];

    if (port) {
      return supportedPorts.indexOf(port) === -1;
    }

    return false;
  }

  grunt.registerMultiTask('saucelabs-jasmine', 'Run Jasmine test cases using Sauce Labs browsers', function() {
    var done = this.async(),
      arg = defaults(this.options(defaultsObj));

    runTask(arg, 'jasmine', done);

  });

  grunt.registerMultiTask('saucelabs-qunit', 'Run Qunit test cases using Sauce Labs browsers', function() {
    var done = this.async(),
      arg = defaults(this.options(defaultsObj));

    runTask(arg, 'qunit', done);

  });

  grunt.registerMultiTask('saucelabs-yui', 'Run YUI test cases using Sauce Labs browsers', function() {
    var done = this.async(),
    arg = defaults(this.options(defaultsObj));

    runTask(arg, 'YUI Test', done);

  });

  grunt.registerMultiTask('saucelabs-mocha', 'Run Mocha test cases using Sauce Labs browsers', function() {
    var done = this.async(),
      arg = defaults(this.options(defaultsObj));

    runTask(arg, 'mocha', done);

  });

  grunt.registerMultiTask('saucelabs-custom', 'Run custom test cases using Sauce Labs browsers', function() {
    var done = this.async(),
      arg = defaults(this.options(defaultsObj));

    runTask(arg, 'custom', done);

  });
};
