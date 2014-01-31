grunt-saucelabs
---------------------

[![Build Status](https://api.travis-ci.org/axemclion/grunt-saucelabs.png?branch=master)](https://travis-ci.org/axemclion/grunt-saucelabs)
[![Selenium Test Status](https://saucelabs.com/buildstatus/grunt-sauce)](https://saucelabs.com/u/grunt-sauce)

[![Selenium Test Status](https://saucelabs.com/browser-matrix/grunt-sauce.svg)](https://saucelabs.com/u/grunt-sauce)

[![Dependency Status](https://david-dm.org/axemclion/grunt-saucelabs.png)](https://david-dm.org/axemclion/grunt-saucelabs) [![devDependency Status](https://david-dm.org/axemclion/grunt-saucelabs/dev-status.png)](https://david-dm.org/axemclion/grunt-saucelabs#info=devDependencies)

A Grunt task for running QUnit, Jasmine, Mocha and YUI tests using Sauce Labs' Cloudified Browsers.

[Grunt](http://gruntjs.com/) is a task-based command line build tool for JavaScript projects, based on nodejs.
[QUnit](http://qunitjs.com/) is a powerful, easy-to-use JavaScript unit test suite used by the jQuery, jQuery UI and jQuery Mobile projects and is capable of testing any generic JavaScript code, including itself!
[Mocha](http://visionmedia.github.io/mocha/) is a JavaScript test framework for running serial asynchronous tests.
[YUI Test](http://developer.yahoo.com/yui/yuitest/) is a browser-based testing framework from Yahoo!.
[Sauce Labs](https://saucelabs.com/) offers browser environments on the cloud for testing code.

About the tool
--------------
The [grunt-contrib-qunit](https://github.com/gruntjs/grunt-contrib-qunit) task runs QUnit based test suites on [PhantomJS](http://phantomjs.org/).
The `saucelabs-qunit` task is very similar but runs the test suites on the cloudified browser environment provided by Sauce Labs. This ensures that subject of the test runs across different browser environment.
The task also uses [Sauce Connect](https://saucelabs.com/docs/connect) to establish a tunnel between Sauce Labs browsers and the machine running Grunt to load local pages. This is typically useful for testing pages on localhost that are not publicly accessible on the internet.
The `saucelabs-jasmine` runs [Jasmine](http://pivotal.github.io/jasmine/) tests in the Sauce Labs browser. The `saucelabs-jasmine` task requires `jasmine-1.3.0`. There are also `saucelabs-mocha` and `saucelabs-yui` tasks that let you run your Mocha and YUI tests on Sauce Labs cloudified browser environment.

Usage
------
This task is available as a [node package](https://npmjs.org/package/grunt-saucelabs) and can be installed as `npm install grunt-saucelabs`. It can also be included as a devDependency in package.json in your node project.

To use the task in `grunt.js`, load the npmTask.


```javascript
grunt.loadNpmTasks('grunt-saucelabs');

```

In the `grunt.initConfig`, add the configuration that looks like the following

```javascript
'saucelabs-qunit': {
  all: {
      options: {
      username: 'saucelabs-user-name', // if not provided it'll default to ENV SAUCE_USERNAME (if applicable)
      key: 'saucelabs-key', // if not provided it'll default to ENV SAUCE_ACCESS_KEY (if applicable)
      urls: ['array of URLs for unit test pages'],
      build: process.env.CI_BUILD_NUMBER,
      tunneled: 'true (default) / false; false if you choose to skip creating a Sauce connect tunnel.',
      tunnelTimeout: 'A numeric value indicating the time to wait before closing all tunnels',
      testInterval: 'Milliseconds between retries to check if the tests are completed',
      testname: 'Name of the test',
      tags: ['Array of tags'],
      browsers: [{
        browserName: 'firefox',
		    version: '19',
		    platform: 'XP'
      }],
      onTestComplete: function(result){
        // Called after a unit test is done, per page, per browser
        // 'result' param is the object returned by the test framework's reporter

        // Returning true or false, passes or fails the test
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
}

```

The configuration of `saucelabs-jasmine`, `saucelabs-mocha`, `saucelabs-yui` are exactly the same.
Note the options object inside a grunt target. This was introduced in grunt-saucelabs-* version 4.0.0 to be compatible with grunt@0.4.0


The parameters are

* __username__ : The Sauce Labs username that will be used to connect to the servers. _Required_
* __key__ : The Sauce Labs secret key. Since this is a secret, this should not be checked into the source code and may be available as an environment variable. Grunt can access this using   `process.env.saucekey`. _Required_
* __urls__: An array or URLs that will be loaded in the browsers, one after another. Since SauceConnect is used, these URLs can also be localhost URLs that are available using the `server` task from grunt. _Required_
* __tunneled__: Defaults to true; Won't launch a Sauce Connect tunnel if set to false. _Optional_
* __testname__: The name of this test, displayed on the Sauce Labs dashboard. _Optional_
* __build__: The build number for this test. _Optional_
* __tags__: An array of tags displayed for this test on the Sauce Labs dashboard. This can be the commit number, branch name, etc, that can be obtained from grunt. _Optional_
* __browsers__: An array of objects representing the [various browsers](https://saucelabs.com/docs/platforms) on which this test should run.  _Optional_
* __testInterval__ : Number of milliseconds between each retry to see if a test is completed or not (default: 5000). _Optional_
* __onTestComplete__ : A callback that is called every time a unit test for a page is complete. Runs per page, per browser configuration. Receives a 'result' argument which is the javascript object exposed to sauce labs. A true or false return value passes or fails the test, undefined return value does not alter the result of the test. For async results, call `this.async()` in the function. The return of `this.async()` is a function that should be called once the async action is completed. _Optional_

A typical `test` task running from Grunt could look like `grunt.registerTask('test', ['server', 'qunit', 'saucelabs-qunit']);` This starts a server and then runs the QUnit tests first on PhantomJS and then using the Sauce Labs browsers.

Exposing Test Results to the Sauce Labs API
-------------------------------------------
Since this project uses the Sauce Labs js unit test API, the servers at Sauce Labs need a way to get the results of your test. Follow the instructions below to assure that the results of your tests are delivered properly.

### Test result details with Jasmine ###

You can make Job Details pages more informative on Sauce by providing more data with each test. You will get info about each test run inside your suite directly on Sauce pages.

[![Jasmine detailed results](https://saucelabs.com/images/front-tests/jasmine.png)](https://saucelabs.com/docs/javascript-unit-tests-integration)

You can do that by using [Jasmine JS Reporter](https://github.com/detro/jasmine-jsreporter) that will let `saucelabs-jasmine` task provide in-depth data about each test as a JSON object.

All you need to do is to include the new jasmine-jsreporter reporter to the page running Jasmine tests by adding new script in header:
```html
<script src="path/to/jasmine-jsreporter.js" type="text/javascript"></script>
```
and telling Jasmine to use it:
```javascript
jasmineEnv.addReporter(new jasmine.JSReporter());
````

### Test result details with QUnit ###

Add the following to your QUnit test specification
```javascript
QUnit.done(function(results){
	window.global_test_results = results;
});
```

### Test result details with mocha ###

Add the following to the mocha test page html. Make sure you remove any calls to ```mocha.checkLeaks()``` or add ```mochaResults``` to the list of globals.
```html
<script>
  onload = function(){
    //mocha.checkLeaks();
    //mocha.globals(['foo']);
    var runner = mocha.run();

    runner.on('end', function(){
      window.mochaResults = runner.stats;
    });

  };
</script>
```

### Test result details with YUI Test ###

There's nothing you have to do for YUI Tests! The js library already exposes ```window.YUITest.TestRunner.getResults()```

Examples
--------
Some projects that use this task are as follows. You can take a look at their GruntFile.js for sample code

* [This project](https://github.com/axemclion/grunt-saucelabs/blob/master/Gruntfile.js)
* [Jquery-IndexedDB](https://github.com/axemclion/jquery-indexeddb/blob/master/GruntFile.js)
* [IndexedDBShim](https://github.com/axemclion/IndexedDBShim/blob/master/Gruntfile.js)

If you have a project that uses this plugin, please add it to this list and send a pull request.

Integration with a CI system
--------------------------
Grunt tasks are usually run alongside a continuous integration system. For example, when using [Travis](https://travis-ci.org), adding the following lines in the package.json ensures that the task is installed with `npm install` is run. Registering Sauce Labs in test task using `grunt.registerTask('test', ['server', 'saucelabs-qunit']);` ensures that the CI environment runs the tests using `npm test`.
To secure the Sauce Key, the CI environment can be configured to provide the key as an environment variable instead of specifying it file. CI Environments like Travis provide [ways](http://about.travis-ci.org/docs/user/build-configuration/#Secure-environment-variables) to add secure variables in the initial configuration.
The [IndexedDBShim](http://github.com/axemclion/IndexedDBShim) is a project that uses this plugin in a CI environment. Look at the [.travis.yml](https://github.com/axemclion/IndexedDBShim/blob/master/.travis.yml) and the [grunt.js](https://github.com/axemclion/IndexedDBShim/blob/master/Gruntfile.js) for usage example.
