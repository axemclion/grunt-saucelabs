grunt-saucelabs-qunit
---------------------

A Grunt task for running qunit tests using Sauce Labs' Cloudified Browsers. 

[Grunt](http://gruntjs.com/) is a task-based command line build tool for JavaScript projects, based on nodejs. 
[QUnit](http://qunitjs.com/) is a powerful, easy-to-use JavaScript unit test suite used by the jQuery, jQuery UI and jQuery Mobile projects and is capable of testing any generic JavaScript code, including itself! 
[Sauce Labs](https://saucelabs.com/) offers browser environments on the cloud for testing code. 

About the tool
--------------
The [Grunt Qunit](https://github.com/gruntjs/grunt/blob/master/docs/task_qunit.md) task runs qunit based test suites on [PhantomJS]. This Grunt-Saucelabs-Qunit task is very similar but runs the test suites on the cloudified browser environment provided by Sauce Labs. This ensures that subject of the test runs across different browser environment. 
The task also uses [Sauce Connect](https://saucelabs.com/docs/sauce-connect) to establish a tunnel between Sauce Labs browsers and the machine running Grunt to load local pages. This is typically useful for testing pages on localhost that are not publically accessible on the internet. 

Usage
------
This task is available as a [node package](https://npmjs.org/package/grunt-saucelabs-qunit) and can be installed as `npm install grunt-saucelabs-qunit`. It can also be included as a devDependency in package.json in your node project. 

To use the task in `grunt.js`, load the npmTask. 


```javascript
grunt.loadNpmTasks('grunt-saucelabs-qunit');

``` 

In the `grunt.initConfig`, add the configuration that looks like the following

```javascript
'saucelabs-qunit': {
	all: {
		username: 'saucelabs-user-name',
		key: 'saucelabs-key',
		urls: ['array or URLs to to load for QUnit'],
		tunnelTimeout: ['A numeric value indicating the time to wait before closing all tunnels '],
		testname: 'Name of the test',
		tags: ['Array of tags']
		browsers: [{
			browserName: 'opera'
		}]
	}
}

```

The parameters are 

* __username__ : The saucelabs username that will be used to connect to the servers. _Required_
* __key__ : The Saucelabs secret key. Since this is a secret, this should not be checked into the source code and may be available as an environment variable. Grunt can access this using 	`process.env.saucekey`. _Required_
* __urls__: An array or URLs that will be loaded in the browsers, one after another. Since SauceConnect is used, these URLs can also be localhost URLs that are available using the `server` task from grunt. _Required_
* __testname__: The name of this test, displayed on the SauceLabs dashboard. _Optional_
* __tags__: An array of tags displayed for this test on the SauceLabs dashboard. This can be the build number, commit number, etc, that can be obtained from grunt. 
* __browsers__: An array of objects representing the [various browsers](https://saucelabs.com/docs/browsers) on which this test should run.  _Optional_

A typical `test` task running from Grunt could look like `grunt.registerTask('test', 'server qunit saucelabs-qunit');` This starts a server and then runs the Qunit tests first on PhantomJS and then using the Sauce Labs browsers. 

Here is an __example__ `grunt.js` file - [https://gist.github.com/4061787](https://gist.github.com/4061787).

Integration with a CI system
--------------------------
Grunt tasks are usually run alongside a continuous integration system. For example, when using [Travis](travis-ci.org), adding the following lines in the package.json ensures that the task is installed with `npm install` is run. Registering Saucelabs in test task using `grunt.registerTask('test', 'server saucelabs-qunit');` ensures that the CI environment runs the tests using `npm test`. 
To secure the Sauce Key, the CI environment can be configured to provide the key as an environment variable instead of specifying it file. CI Environments like Travis provide [ways](http://about.travis-ci.org/docs/user/build-configuration/#Secure-environment-variables) to add secure variables in the initial configuration.
The [IndexedDBShim](http://github.com/axemclion/IndexedDBShim) is a project that uses this plugin in a CI environment. Look at the [.travis.yml](https://github.com/axemclion/IndexedDBShim/blob/master/.travis.yml) and the [grunt.js](https://github.com/axemclion/IndexedDBShim/blob/master/grunt.js) for usage example. 