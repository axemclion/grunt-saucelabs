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
		var args = ["-jar", grunt.file.expand("**/Sauce-Connect.jar"), this.user, this.key];
		this.proc = proc.spawn('java', args);
		
		this.proc.stdout.on('data', function(data){
			console.log(data.toString().replace(/[\n\r]/g, ''));
			if (data.toString().match(/Connected\! You may start your tests/)) {
				// console.log('=> Saucelabs Tunnel established');
				callback();
			}
		});
		
		this.proc.stderr.on('data', function(data){
			// console.log(data.toString().replace(/[\n\r]/g, ''));
		});
		
		this.proc.on('exit', function(code){
			console.log('=> Saucelabs Tunnel disconnected ', code);
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
				})
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
						console.log("=> %s. Saucelabs tunnels already exist, will try to connect again %s seconds.".red, retryCount, me.tunnelTimeout / 5);
						setTimeout(function(){
							waitForTunnelsToDie(retryCount + 1);
						}, 1000 * me.tunnelTimeout / 5);
					}
				}(0));
			}
			else {
				console.log("=> SauceLabs trying to open tunnel".inverse);
				me.openTunnel(callback);
			}
		});
	};
	
	SauceTunnel.prototype.stop = function(callback){
		this.proc.kill();
		this.killAllTunnels(function(){
			callback();
		});
	}
	
	grunt.registerMultiTask('saucelabs-qunit', 'Run Qunit test cases using SauceLab browsers', function(){
		var me = this, done = this.async();
		this.data.url = this.data.url || this.data.urls;
		if (Object.prototype.toString.call(this.data.url) === '[object Array]') {
			pages = this.data.url;
		}
		else {
			pages = [this.data.url];
		}
		
		var tunnel = new SauceTunnel(this.data.username, this.data.key, this.data.tunnelTimeout || 120);
		console.log("=> Starting Tunnel to Saucelabs".inverse.bold);
		
		function teardown(status, message){
			try {
				console.log.apply(console, arguments);
			} 
			catch (e) {
				console.log(message);
			}
			tunnel.stop(function(){
				done(status);
			});
		}
		
		tunnel.start(function(isCreated){
			var browser = wd.remote('ondemand.saucelabs.com', 80, me.data.username, me.data.key);
			browser.on('status', function(info){
				// console.log('> \x1b[36m%s\x1b[0m', info);
			});
			
			browser.on('command', function(meth, path){
				// console.log(' > \x1b[33m%s\x1b[0m: %s', meth, path);
			});
			
			browser.init(function(){
				console.log("Browser initialized".inverse);
				var hasFailed = false;
				(function testpage(i){
					if (i >= pages.length) {
						teardown(!hasFailed, "All pages tested successfully");
						return;
					}
					browser.get(pages[i], function(err){
						if (err) {
							teardown(false, "Could not fetch page", err);
							return;
						}
						console.log("Fetched the page, now waiting for tests");
						var testResult = "qunit-testresult";
						browser.waitForElementById(testResult, 1000 * 5, function(){
							console.log("Test div found, fetching the test result element");
							browser.elementById(testResult, function(err, el){
								if (err) {
									teardown(false, "Could not get element by id", err);
									return;
								}
								console.log("Fetched test result element, waiting for text inside it to change to complete");
								var retryCount = 0;
								(function isCompleted(){
									browser.text(el, function(err, text){
										if (err) {
											teardown(false, "Could not see text inside element", err);
											return;
										}
										if (!text.match(/completed/) && ++retryCount < 10) {
											console.log("%s. Still running", retryCount);
											setTimeout(isCompleted, 1000 * 5);
											return;
										}
										if (retryCount >= 10) {
											teardown(false, "More than number of retries");
											return;
										}
										x = text.split(/\n|of|,/);
										if (parseInt(x[1], 10) !== parseInt(x[2], 10)) {
											hasFailed = true;
											console.log(" => (%s:%s) Tests ran for %s with result %s".red, i + 1, pages.length, pages[i], text);
										}
										else {
											console.log(" => (%s:%s) Tests ran for %s with result %s".green, i + 1, pages.length, pages[i], text);
										}
										testpage(i + 1);
									});
								}());
							});
						});
					});
				}(0));
			});
		});
	});
};
