module.exports = function(grunt) {
  var _ = (grunt.utils || grunt.util)._,
    request = require('request'),
    wd = require('wd'),
    SauceTunnel = require('sauce-tunnel'),
    Q = require('q');
    rqst = request.defaults({
      jar: false
    });

  var TestResult = function(jobId, user, key){
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
        "js tests": [jobId],
      }
    };

    var checkStatus = function(){
      
      rqst(requestParams, function(error, response, body){
        if (error){
          //TODO: error here, fail hard?
        }

        if (!body.completed){
          setTimeout(checkStatus ,3000);
        } else {
          deferred.resolve(body['js tests'][0]);
        }

      });
    };

    checkStatus();
    
    return deferred.promise;
  };

  var TestRunner = function(user, key) {
    this.user = user;
    this.key = key;
    this.url = 'https://saucelabs.com/rest/v1/' + this.user + '/js-tests';
    this.results = new Array();
    this.numberOfJobs = 0;
  };

  TestRunner.prototype.runTests = function(browsers, urls, framework, tunnelIdentifier, onTestComplete, callback){
    var me = this;
    var numberOfJobs = browsers.length * urls.length;

    var addResultPromise = function(promise){
      me.results.push(promise);
      console.log(me.results.length, "/", numberOfJobs, 'tests started');
      if (me.results.length == numberOfJobs){

        Q.all(me.results).then(function(results){
          var results = results.map(function(result){
            return result.valueOf().result.passed;
          });

          callback(results);
        });
      };
    };

    urls.forEach(function(url){
      me.runTest(browsers, url, framework, tunnelIdentifier, function(taskIds){
        console.log('got task ids: ', taskIds)
        taskIds.forEach(function(taskId){
          var resultPromise = new TestResult(taskId, me.user, me.key);
          addResultPromise(resultPromise);
          resultPromise.then(function(result){
            
            grunt.log.subhead("\nTested %s", url);
            grunt.log.writeln("Platform: %s", result.platform);
            if (result.result.passed === undefined){
              grunt.log.error(result.result.message);
            } else {
              grunt.log.writeln("Passed: %s", result.result.passed);
            }
            grunt.log.writeln("Url %s", result.url);
            
            onTestComplete(result);
          });
        });
      });
    });
  };

  TestRunner.prototype.runTest = function(browsers, url, framework, tunnelIdentifier, callback){
    var me = this;

    var parsePlatforms = function(browsers){
      return browsers.map(function(browser){
        return [browser.platform, browser.browserName, browser.version || ""];
      });
    };

    console.log('running test in runTest:', parsePlatforms(browsers), url, framework);

    var requestParams = {
      method: 'post',
      url: this.url,
      auth: {
        user: this.user,
        pass: this.key 
      },
      json: true,
      body: {
        platforms: parsePlatforms(browsers),
        url: url,
        framework: framework,
        tunnel: "tunnel-identifier:" + tunnelIdentifier,
      }
    };

    rqst(requestParams, function(error, response, body){
      console.log(error, body);

      callback(body['js tests']);

    });
  }

  var defaultsObj = {
    username: process.env.SAUCE_USERNAME,
    key: process.env.SAUCE_ACCESS_KEY,
    identifier: Math.floor((new Date()).getTime() / 1000 - 1230768000).toString(),
    tunneled: true,
    testTimeout: (1000 * 60 * 5),
    tunnelTimeout: 120,
    testInterval: 1000 * 5,
    testReadyTimeout: 1000 * 5,
    onTestComplete: function() {

    },
    detailedError: false,
    testname: "",
    tags: [],
    browsers: [{}]
  };

  function defaults(data) {
    var result = data;
    result.pages = result.url || result.urls;
    if (!_.isArray(result.pages)) {
      result.pages = [result.pages];
    }

    _.map(result.browsers, function(d) {
      return _.extend(d, {
        'name': result.testname,
        'tags': result.tags,
        'build': result.build,
        'tunnel-identifier': result.tunneled ? result.identifier : ''
      });
    });
    result.concurrency = result.concurrency || result.browsers.length;
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

  grunt.registerMultiTask('saucelabs-jasmine', 'Run Jasmine test cases using Sauce Labs browsers', function() {
    var done = this.async(),
      arg = defaults(this.options(defaultsObj));
    //var tunnel = new SauceTunnel(arg.username, arg.key, arg.identifier, arg.tunneled, arg.tunnelTimeout);
    //configureLogEvents(tunnel);
    //grunt.log.writeln("=> Connecting to Saucelabs ...");
    //if (this.tunneled) {
    //  grunt.verbose.writeln("=> Starting Tunnel to Sauce Labs".inverse.bold);
    //}
    /*
    tunnel.start(function(isCreated) {
      if (!isCreated) {
        done(false);
        return;
      }
      grunt.log.ok("Connected to Saucelabs");
      
      
      /*test.forEachBrowser(arg.browsers, 'jasmine', arg.concurrency, arg.onTestComplete).testPages(arg.pages, arg.testTimeout, arg.testInterval, arg.testReadyTimeout, arg.detailedError, function(status) {
        grunt.log[status ? 'ok' : 'error']("All tests completed with status %s", status);
        tunnel.stop(function() {
          done(status);
        });
      });*/
      var test = new TestRunner(arg.username, arg.key);

      test.runTests(arg.browsers, arg.pages, 'jasmine', 'jonahIsCool', arg.onTestComplete, function(status){
        status = status.every(function(passed){ return passed });
        grunt.log[status ? 'ok' : 'error']("All tests completed with status %s", status);
        done(status);
      });

    //});
  });

  grunt.registerMultiTask('saucelabs-qunit', 'Run Qunit test cases using Sauce Labs browsers', function() {
    var done = this.async(),
      arg = defaults(this.options(defaultsObj));
    var tunnel = new SauceTunnel(arg.username, arg.key, arg.identifier, arg.tunneled, arg.tunnelTimeout);
    configureLogEvents(tunnel);
    grunt.log.writeln("=> Connecting to Saucelabs ...");
    if (this.tunneled) {
      grunt.verbose.writeln("=> Starting Tunnel to Sauce Labs".inverse.bold);
    }
    tunnel.start(function(isCreated) {
      if (!isCreated) {
        done(false);
        return;
      }
      grunt.log.ok("Connected to Saucelabs");
      var test = new TestRunner(arg.username, arg.key);
      test.forEachBrowser(arg.browsers, test.qunitRunner, test.qunitSaucify, arg.concurrency, arg.onTestComplete).testPages(arg.pages, arg.testTimeout, arg.testInterval, arg.testReadyTimeout, arg.detailedError, function(status) {
        grunt.log[status ? 'ok' : 'error']("All tests completed with status %s", status);
        tunnel.stop(function() {
          done(status);
        });
      });
    });
  });

  grunt.registerMultiTask('saucelabs-yui', 'Run YUI test cases using Sauce Labs browsers', function() {
    var done = this.async(),
      arg = defaults(this.options(defaultsObj));
    var tunnel = new SauceTunnel(arg.username, arg.key, arg.identifier, arg.tunneled, arg.tunnelTimeout);
    grunt.log.writeln("=> Connecting to Saucelabs ...");
    if (this.tunneled) {
      grunt.verbose.writeln("=> Starting Tunnel to Sauce Labs".inverse.bold);
    }
    tunnel.start(function(isCreated) {
      if (!isCreated) {
        done(false);
        return;
      }
      grunt.log.ok("Connected to Saucelabs");
      var test = new TestRunner(arg.username, arg.key);
      test.forEachBrowser(arg.browsers, test.yuiRunner, test.yuiSaucify, arg.concurrency, arg.onTestComplete).testPages(arg.pages, arg.testTimeout, arg.testInterval, arg.testReadyTimeout, arg.detailedError, function(status) {
        grunt.log[status ? 'ok' : 'error']("All tests completed with status %s", status);
        tunnel.stop(function() {
          done(status);
        });
      });
    });
  });

  grunt.registerMultiTask('saucelabs-mocha', 'Run Mocha test cases using Sauce Labs browsers', function() {
    var done = this.async(),
      arg = defaults(this.options(defaultsObj));
    var tunnel = new SauceTunnel(arg.username, arg.key, arg.identifier, arg.tunneled, arg.tunnelTimeout);
    grunt.log.writeln("=> Connecting to Saucelabs ...");
    if (this.tunneled) {
      grunt.verbose.writeln("=> Starting Tunnel to Sauce Labs".inverse.bold);
    }
    tunnel.start(function(isCreated) {
      if (!isCreated) {
        done(false);
        return;
      }
      grunt.log.ok("Connected to Saucelabs");
      var test = new TestRunner(arg.username, arg.key);
      test.forEachBrowser(arg.browsers, test.mochaRunner, test.mochaSaucify, arg.concurrency, arg.onTestComplete).testPages(arg.pages, arg.testTimeout, arg.testInterval, arg.testReadyTimeout, arg.detailedError, function(status) {
        grunt.log[status ? 'ok' : 'error']("All tests completed with status %s", status);
        tunnel.stop(function() {
          done(status);
        });
      });
    });
  });
};
