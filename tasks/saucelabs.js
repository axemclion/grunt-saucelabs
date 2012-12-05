module.exports = function(grunt){
	var sauce = require('saucelabs');
	var request = require('request');
	var proc = require('child_process');
	var wd = require('wd');
	var fs = require('fs');
	var SauceTunnel = function(user, key, tunnelTimeout){
		this.user = user;
		this.key = key;
		this.tunnelTimeout = tunnelTimeout;
		this.baseUrl = ["https://", this.user, ':', this.key, '@saucelabs.com', '/rest/v1/', this.user].join("");
	};
	
	SauceTunnel.prototype.openTunnel = function(callback){
		var args = ["-jar", grunt.file.expand("**/Sauce-Connect.jar")[0], this.user, this.key];
		this.proc = proc.spawn('java', args);
		var calledBack = false;
		
		this.proc.stdout.on('data', function(data){
			if (!data.toString().match(/^\[-u,/g)) {
				console.log(data.toString().replace(/[\n\r]/g, ''));
			}
			if (data.toString().match(/Connected\! You may start your tests/)) {
				// console.log('=> Saucelabs Tunnel established');
				if (!calledBack) {
					calledBack = true;
					callback(true);
				}
			}
		});
		
		this.proc.stderr.on('data', function(data){
			console.log(data.toString().replace(/[\n\r]/g, '').red);
		});
		
		this.proc.on('exit', function(code){
			console.log('=> Saucelabs Tunnel disconnected ', code);
			if (!calledBack) {
				calledBack = true;
				callback(false);
			}
		});
	};
	
	SauceTunnel.prototype.getTunnels = function(callback){
		request({
			url: this.baseUrl + '/tunnels',
			json: true
		}, function(err, resp, body){
			callback(body);
		});
	};
	
	SauceTunnel.prototype.killAllTunnels = function(callback){
		var me = this;
		console.log("Trying to kill all tunnels");
		this.getTunnels(function(tunnels){
			(function killTunnel(i){
				if (i >= tunnels.length) {
					setTimeout(callback, 1000 * 5);
					return;
				}
				console.log("Killing tunnel %s".red, tunnels[i]);
				request({
					method: "DELETE",
					url: me.baseUrl + "/tunnels/" + tunnels[i],
					json: true
				}, function(){
					killTunnel(i + 1);
				});
			}(0));
		});
	};
	
	SauceTunnel.prototype.start = function(callback){
		var me = this;
		this.getTunnels(function(tunnels){
			if (tunnels.length > 0) {
				console.log("=> Looks like there are existing tunnels to saucelabs - %s".bold, tunnels);
				var retryCount = 0;
				(function waitForTunnelsToDie(retryCount){
					if (retryCount > 5) {
						console.log("=> Waited for %s retries, now trying to shut down all tunnels and try again".bold, retryCount);
						me.killAllTunnels(function(){
							me.start(callback);
						});
					}
					else {
						console.log("=> %s. Saucelabs tunnels already exist, will try to connect again %s milliseconds.".red, retryCount, me.tunnelTimeout / 5);
						setTimeout(function(){
							waitForTunnelsToDie(retryCount + 1);
						}, me.tunnelTimeout / 5);
					}
				}(0));
			}
			else {
				console.log("=> SauceLabs trying to open tunnel".inverse);
				me.openTunnel(function(status){
					callback(status);
				});
			}
		});
	};
	
	SauceTunnel.prototype.stop = function(callback){
		this.proc.kill();
		this.killAllTunnels(function(){
			callback();
		});
	};
	
	var TestRunner = function(user, key){
		this.browser = wd.remote('ondemand.saucelabs.com', 80, user, key);
		this.browser.on('status', function(info){
			// console.log('> \x1b[36m%s\x1b[0m', info);
		});
		this.browser.on('command', function(meth, path){
			// console.log(' > \x1b[33m%s\x1b[0m: %s', meth, path);
		});
	};
	
	TestRunner.prototype.forEachBrowser = function(configs, runner, onTestComplete){
		var me = this;
		return {
			testPages: function(pages, testTimeout, callback){
				var success = true;
				function onPageTested(status, page, config, cb){
					var waitForAsync = false;
					this.async = function(){
						waitForAsync = true;
						return function(ret){
							if (typeof ret !== "undefined") {
								success = success && ret;
							}
							cb();
						};
					};
					if (typeof onTestComplete === "function") {
						var ret = onTestComplete(status, page, config);
						status = typeof ret === "undefined" ? status : ret;
					}
					if (!waitForAsync) {
						success = success && status;
						cb();
					}
				}
				(function initBrowser(i){
					if (i >= configs.length) {
						callback(success);
						return;
					}
					console.log("Starting tests on browser configuration".cyan, configs[i]);
					me.browser.init(configs[i], function(err, sessionId){
						if (err) {
							console.log("Could not initialize browser for session".red, sessionId, configs[i]);
							success = false;
							initBrowser(i + 1);
							return;
						}
						(function testPage(j){
							if (j >= pages.length) {
								me.browser.quit();
								initBrowser(i + 1);
								return;
							}
							console.log("Starting test for page (%s) %s".cyan, j, pages[j]);
							me.browser.get(pages[j], function(err){
								if (err) {
									console.log("Could not fetch page (%s)%s".red, j, pages[j]);
									onPageTested(false, pages[j], configs[i], function(){
										testPage(j + 1);
									});
									return;
								}
								runner.call(me, testTimeout, function(status){
									onPageTested(status, pages[j], configs[i], function(){
										testPage(j + 1);
									});
								});
							});
						}(0));
					});
				}(0));
			}
		};
	};
	
	TestRunner.prototype.jasmineRunner = function(testTimeout, callback){
		var browser = this.browser;
		console.log("Starting Jasmine tests".cyan);
		browser.waitForElementByClassName('alert', 1000 * 5, function(err, el){
			browser.elementsByClassName('version', function(err, el){
				if (err) {
					console.log("Could not get element by id", err);
					callback(false);
					return;
				}
				browser.text(el, function(err, versionText){
					if (err) {
						console.log("Could not see test inside element", err);
						callback(false);
					}
					
					var versionMatch = versionText.match(/[0-9]+(\.[0-9]+)*/);
					var version = versionMatch && versionMatch[0];
					console.log("Detected jasmine version", version);
					var resultParser = {
						"1.2.0" : {
							"resultClass": "description",
							"success": /0 failures/,
							"fail": /([1-9][0-9]*)\s*failure/
						},
						"1.3.0" : {
							"resultClass": "alert",
							"success": /Passing/,
							"fail": /Failing/
						}
					};

					browser.elementsByClassName(resultParser[version].resultClass, function(err, els){
						if (err) {
							console.log("Could not get element by id", err);
							callback(false);
							return;
						}
						console.log("Fetched test result element, waiting for text inside it to change to complete");
						var el = els[0];
						var retryCount = 0;
						var testInterval = 5000;
						(function isCompleted(){
							browser.text(el, function(err, text){
								if (err) {
									console.log("Could not see test inside element", err);
									callback(false);
								}
								else if (retryCount >= testTimeout / testInterval) {
									console.log("Failed, waited for more than %s milliseconds".red, testTimeout);
									callback(false);
								}
								else if (text.match(resultParser[version].fail)) {
									console.log(" => Tests ran result %s".red, text);
									callback(false);
								}
								else if (text.match(resultParser[version].success)) {
									console.log(" => Tests ran result %s".green, text);
									callback(true);
								}
								else if (++retryCount < testTimeout / testInterval) {
									console.log("%s. Still running, Time passed - %s of %s milliseconds".red, retryCount, testInterval * retryCount, testTimeout);
									setTimeout(isCompleted, testInterval);
								}
							});
						}());
					})
				})
			})
		})
	};
	
	TestRunner.prototype.qunitRunner = function(testTimeout, callback){
		var browser = this.browser;
		var testResult = "qunit-testresult";
		console.log("Starting qunit tests".cyan);
		browser.waitForElementById(testResult, 1000 * 5, function(){
			console.log("Test div found, fetching the test result element".cyan);
			browser.elementById(testResult, function(err, el){
				if (err) {
					console.log("Could not get element by id", err);
					callback(false);
					return;
				}
				console.log("Fetched test result element, waiting for text inside it to change to complete");
				var retryCount = 0;
				var testInterval = 5000;
				(function isCompleted(){
					browser.text(el, function(err, text){
						if (err) {
							console.log("Could not see test inside element", err);
							callback(false);
							return;
						}
						if (!text.match(/completed/) && ++retryCount < testTimeout / testInterval) {
							console.log("%s. Still running, Time passed - %s of %s milliseconds".red, retryCount, testInterval * retryCount, testTimeout);
							setTimeout(isCompleted, testInterval);
							return;
						}
						if (retryCount >= testTimeout / testInterval) {
							console.log("Failed, waited for more than %s milliseconds".red, testTimeout);
							callback(false);
							return;
						}
						x = text.split(/\n|of|,/);
						if (parseInt(x[1], 10) !== parseInt(x[2], 10)) {
							console.log(" => Tests ran result %s".red, text);
							callback(false);
						}
						else {
							console.log(" => Tests ran result %s".green, text);
							callback(true);
						}
					});
				}());
			});
		});
	};
	
	function defaults(data){
		var result = {};
		result.url = data.url || data.urls;
		if (grunt.utils._.isArray(result.url)) {
			result.pages = result.url;
		}
		else {
			result.pages = [result.url];
		}
		
		result.username = data.username;
		result.key = data.key;
		result.tunnelTimeout = data.tunnelTimeout || 120;
		result.testTimeout = data.testTimeout || (1000 * 60 * 5);
		result.onTestComplete = data.onTestComplete;
		
		grunt.utils._.map(data.browsers, function(d){
			d.name = d.name || data.testname || "";
			d.tags = d.tags || data.tags || [];
		});
		result.configs = data.browsers || [{}];
		return result;
	}
	
	grunt.registerMultiTask('saucelabs-jasmine', 'Run Jasmine test cases using SauceLab browsers', function(){
		var done = this.async(), arg = defaults(this.data);
		var tunnel = new SauceTunnel(arg.username, arg.key, arg.tunnelTimeout);
		console.log("=> Starting Tunnel to Saucelabs".inverse.bold);
		tunnel.start(function(isCreated){
			if (!isCreated) {
				done(false);
			}
			var test = new TestRunner(arg.username, arg.key);
			test.forEachBrowser(arg.configs, test.jasmineRunner, arg.onTestComplete).testPages(arg.pages, arg.testTimeout, function(status){
				console.log("All tests completed with status %s", status);
				tunnel.stop(function(){
					done(status);
				});
			});
		});
	});
	
	grunt.registerMultiTask('saucelabs-qunit', 'Run Qunit test cases using SauceLab browsers', function(){
		var done = this.async(), arg = defaults(this.data);
		var tunnel = new SauceTunnel(arg.username, arg.key, arg.tunnelTimeout);
		console.log("=> Starting Tunnel to Saucelabs".inverse.bold);
		tunnel.start(function(isCreated){
			if (!isCreated) {
				done(false);
			}
			var test = new TestRunner(arg.username, arg.key);
			test.forEachBrowser(arg.configs, test.qunitRunner, arg.onTestComplete).testPages(arg.pages, arg.testTimeout, function(status){
				console.log("All tests completed with status %s", status);
				tunnel.stop(function(){
					done(status);
				});
			});
		});
	});
};
