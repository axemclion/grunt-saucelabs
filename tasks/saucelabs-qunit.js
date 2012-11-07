module.exports = function(grunt){
	var sauce = require('saucelabs');
	var request = require('request');
	var proc = require('child_process');
	var wd = require('wd');
	var fs = require('fs');
	var SauceTunnel = function(user, key){
		this.user = user;
		this.key = key;
	};
	
	SauceTunnel.prototype.openTunnel = function(callback){
		var args = ["-jar", grunt.file.expand("**/Sauce-Connect.jar"), this.user, this.key];
		this.proc = proc.spawn('java', args);
		
		this.proc.stdout.on('data', function(data){
			console.log(data.toString().replace(/[\n\r]/g, ''));
			if (data.toString().match(/Connected\! You may start your tests/)) {
				console.log('=> Saucelabs Tunnel established');
				callback();
			}
		});
		
		this.proc.stderr.on('data', function(data){
			console.log(data.toString().replace(/[\n\r]/g, ''));
		});
		
		this.proc.on('exit', function(code){
			console.log('=> Saucelabs Tunnel disconnected ', code);
		});
	};
	
	SauceTunnel.prototype.getTunnelCount = function(callback){
		var url = ["https://", this.user, ':', this.key, '@saucelabs.com', '/rest/v1/', this.user, '/tunnels'].join("");
		request({
			url: url,
			json: true
		}, function(err, resp, body){
			callback(body);
		});
	};
	
	SauceTunnel.prototype.killAllTunnels = function(callback){
		throw "Method not implemented yet";
	};
	
	SauceTunnel.prototype.start = function(callback){
		var retryCount = 0, me = this;
		this.getTunnelCount(function(tunnels){
			if (tunnels.length > 0) {
				console.log("=> Saucelabs tunnels already exist, will try to connect again in a minute", tunnels);
				console.log("curl -v -X DELETE https://" + me.user + ":" + me.key + "@saucelabs.com/rest/v1/" + me.user + "/tunnels/" + tunnels[0]);
				if (retryCount++ > 10) {
					console.log("=> Waited for %s retries, now trying to shut down all tunnels and try again", retryCount);
					this.killAllTunnels(function(){
						me.start(callback);
					});
				}
				setTimeout(function(){
					me.start(callback);
				}, 1000 * 60);
			} else {
				console.log("=> SauceLabs trying to open tunnel");
				me.openTunnel(callback);
			}
		});
	};
	
	SauceTunnel.prototype.stop = function(callback){
		this.proc.kill();
		callback();
	}
	
	grunt.registerMultiTask('saucelabs-qunit', 'Run Qunit test cases using SauceLab browsers', function(){
		var me = this, done = this.async();
		var tunnel = new SauceTunnel(this.data.username, this.data.key);
		console.log("=> Starting Tunnel to Saucelabs");
		
		function teardown(status, message){
			console.log.apply(console, arguments);
			//tunnel.stop(function(){
			done(status);
			//});
		}
		
		tunnel.start(function(isCreated){
			var browser = wd.remote('ondemand.saucelabs.com', 80, me.data.username, me.data.key);
			browser.on('status', function(info){
				//console.log('> \x1b[36m%s\x1b[0m', info);
			});
			
			browser.on('command', function(meth, path){
				//console.log(' > \x1b[33m%s\x1b[0m: %s', meth, path);
			});
			
			browser.init(function(){
				console.log("Browser initialized");
				browser.get(me.data.url, function(err){
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
										console.log(retryCount + ".Still running")
										setTimeout(isCompleted, 1000 * 5);
										browser.takeScreenshot(function(err, sc){
											fs.writeFile("shot-" + retryCount + ".html", "<img src = 'data:image/png;base64," + sc + "'>", function(){
											});
										});
										return;
									}
									if (retryCount >= 10) {
										console.log("data:image/png,", sc);
										return;
									}
									x = text.split(/\n|of|,/);
									teardown(0 === (parseInt(x[1], 10) - parseInt(x[2], 10)), "Results", text);
								});
							}());
						});
					});
				});
			});
		});
	});
};
