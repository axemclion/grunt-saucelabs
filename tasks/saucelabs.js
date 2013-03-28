module.exports = function(grunt) {
  var _ = (grunt.utils || grunt.util)._;
  var request = require('request');
  var proc = require('child_process');
  var wd = require('wd');
  var rqst = request.defaults({jar: false});
  require('colors');

  var SauceStatus = function(user, key) {
    this.user = user;
    this.key = key;
    this.baseUrl = ["https://", this.user, ':', this.key, '@saucelabs.com', '/rest/v1/', this.user].join("");
  };

  SauceStatus.prototype.passed = function(jobid, status, callback) {
    var _body = JSON.stringify({ "passed": status }),
      _url = this.baseUrl + "/jobs/" + jobid;
    rqst({
      headers: { 'content-type' : 'application/x-www-form-urlencoded' },
      method: "PUT",
      url: _url,
      body: _body,
      json: true
    }, function() {
      callback();
    });
  };

  SauceStatus.prototype.result = function(jobid, data, callback) {
    var _body = JSON.stringify(data),
      _url = this.baseUrl + "/jobs/" + jobid;
    rqst({
      headers: { 'content-type' : 'application/json' },
      method: "PUT",
      url: _url,
      body: _body,
      json: true
    }, function() {
      callback();
    });
  };

  var SauceTunnel = function(user, key, identifier, tunneled, tunnelTimeout) {
      this.user = user;
      this.key = key;
      this.identifier = identifier;
      this.tunneled = tunneled;
      this.tunnelTimeout = tunnelTimeout;
      this.baseUrl = ["https://", this.user, ':', this.key, '@saucelabs.com', '/rest/v1/', this.user].join("");
    };

  SauceTunnel.prototype.openTunnel = function(callback) {
    var args = ["-jar", __dirname + "/Sauce-Connect.jar", this.user, this.key, "-i", this.identifier];
    this.proc = proc.spawn('java', args);
    var calledBack = false;

    this.proc.stdout.on('data', function(data) {
      if(!data.toString().match(/^\[-u,/g)) {
        grunt.verbose.writeln(data.toString().replace(/[\n\r]/g, '').grey);
      }
      if(data.toString().match(/Connected\! You may start your test/)) {
        grunt.log.writeln('[Sauce Labs Tunnel] Connected');
        if(!calledBack) {
          calledBack = true;
          callback(true);
        }
      }
    });

    this.proc.stderr.on('data', function(data) {
      grunt.log.error(data.toString().replace(/[\n\r]/g, ''));
    });

    this.proc.on('exit', function(code) {
      grunt.log.writeln('[Sauce Labs Tunnel] Exited with code ' + code);
      if(!calledBack) {
        calledBack = true;
        callback(false);
      }
    });
  };

  SauceTunnel.prototype.getTunnels = function(callback) {
    rqst({
      url: this.baseUrl + '/tunnels',
      json: true
    }, function(err, resp, body) {
      callback(body);
    });
  };

  SauceTunnel.prototype.killAllTunnels = function(callback) {
    if (!this.tunneled) {
      return callback();
    }
    var me = this;
    grunt.log.writeln("[Sauce Labs Tunnel] Killling all tunnels");
    this.getTunnels(function(tunnels) {
      (function killTunnel(i) {
        if(i >= tunnels.length) {
          setTimeout(callback, 1000 * 5);
          return;
        }
        grunt.verbose.writeln("[Sauce Labs Tunnel] Killing tunnel %s", tunnels[i]);
        rqst({
          method: "DELETE",
          url: me.baseUrl + "/tunnels/" + tunnels[i],
          json: true
        }, function() {
          killTunnel(i + 1);
        });
      }(0));
    });
  };

  SauceTunnel.prototype.start = function(callback) {
    var me = this;
    if (!this.tunneled) {
      return callback(true);
    }

    this.getTunnels(function(tunnels) {
      if (!tunnels){
        grunt.log.error("[Sauce Labs Tunnel] Could not get tunnels. Still continuing to try connect...");
      }
      if(tunnels && tunnels.length > 0) {
        grunt.verbose.writeln("[Sauce Labs Tunnel] Looks like there are existing tunnels - %s", tunnels);
        (function waitForTunnelsToDie(retryCount) {
          if(retryCount >= 5) {
            grunt.log.writeln("[Sauce Labs Tunnel] Waited for %s retries, now trying to shut down all tunnels and try again", retryCount);
            me.killAllTunnels(function() {
              me.start(callback);
            });
          } else {
            grunt.verbose.writeln("[Sauce Labs Tunnel] Tunnels already exist (attempt %s), will try to connect again %s milliseconds.", retryCount, me.tunnelTimeout / 5);
            setTimeout(function() {
              waitForTunnelsToDie(retryCount + 1);
            }, me.tunnelTimeout / 5);
          }
        }(1));
      } else {
        grunt.log.writeln("[Sauce Labs Tunnel] Connecting...");
        me.openTunnel(function(status) {
          callback(status);
        });
      }
    });
  };

  SauceTunnel.prototype.stop = function(callback) {
    if (this.proc) {
      this.proc.kill();
    }
    this.killAllTunnels(function() {
      callback();
    });
  };

  var TestRunner = function(user, key) {
    this.user = user;
    this.key = key;
    this.host = 'ondemand.saucelabs.com';
    this.port = 80;

    this.report = new SauceStatus(user, key);
  };

  TestRunner.prototype.forEachBrowser = function(configs, runner, saucify, concurrency, onTestComplete) {
    var me = this;
    return {
      testPages: function(pages, testTimeout, testInterval, testReadyTimeout, detailedError, callback) {

        function initBrowser(cfg) {
          cfg.name = cfg.name || (cfg.browserName +
            (cfg.version ? '/' + cfg.version : '') +
            (cfg.platform ? '/' + cfg.platform : '')
          );
          var success = true;
          var results = [];

          function onPageTested(status, page, config, browser, cb) {
            var waitForAsync = false;
            this.async = function() {
              waitForAsync = true;
              return function(ret) {
                success = success && (typeof ret === "undefined" ? status : ret);
                cb();
              };
            };
            if(typeof onTestComplete === "function") {
              var ret = onTestComplete(status, page, config, browser);
              status = typeof ret === "undefined" ? status : ret;
            }
            if(!waitForAsync) {
              success = success && status;
              cb();
            }
          }

          return function(done) {
            var driver = wd.remote(me.host, me.port, me.user, me.key);
            grunt.verbose.writeln("[%s] Initializing driver", cfg.name);
            driver.init(cfg, function(err, sessionId) {
              if(err) {
                grunt.log.error("[%s] Could not initialize driver for session %s", cfg.name, sessionId);
                success = false;
                me.report.passed(driver.sessionID, success, function() {
                  done(success);
                });
                return;
              }
              var finished = function(cb) {
                if (results.length > 0 && typeof saucify === 'function') {
                  me.report.result(driver.sessionID, saucify(results), function() {
                    cb(success);
                  });
                } else {
                  cb(success);
                }
              };
              (function testPage(j) {
                if(j >= pages.length) {
                  driver.quit(function() {
                    me.report.passed(driver.sessionID, success, function() {
                      finished(done);
                    });
                  });
                  return;
                }
                grunt.verbose.writeln("[%s] Opening page (%s) %s", cfg.name, j, pages[j]);
                driver.get(pages[j], function(err) {
                  if(err) {
                    grunt.log.error("[%s] Could not open page (%s) %s", cfg.name, j, pages[j]);
                    onPageTested(false, pages[j], cfg, driver, function() {
                      testPage(j + 1);
                    });
                    return;
                  }
                  runner.call(me, driver, cfg, testTimeout, testInterval, testReadyTimeout, detailedError, pages[j], function(status, obj) {
                    results.push(obj);
                    onPageTested(status, pages[j], cfg, driver, function() {
                      grunt.log.writeln("[%s] Job info: http://saucelabs.com/tests/%s", cfg.name, driver.sessionID);
                      testPage(j + 1);
                    });
                  });
                });
              }(0));
            });
          };
        }

        var brwrs = [], curr = 0, running = 0, res = true;
        _.each(configs, function(_c) {
          brwrs.push(initBrowser(_c));
        });

        (function next(success) {
          if (typeof success !== 'undefined') {
            res = res && success;
            running--;
          }

          if (curr >= brwrs.length && running <= 0) {
            return callback(res);
          }

          if (running < concurrency && curr < brwrs.length) {
            brwrs[curr](next);
            curr++;
            running++;
            next();
          }
        }());
      }
    };
  };

  TestRunner.prototype.jasmineRunner = function(driver, cfg,testTimeout, testInterval, testReadyTimeout, detailedError, pageurl, callback) {
    console.log("Starting Jasmine tests".cyan);
    driver.waitForElementByClassName('alert', testReadyTimeout, function() {
      driver.elementsByClassName('version', function(err, el) {
        if(err) {
          console.log("[%s] Could not get element by id".red, cfg.name, err);
          callback(false);
          return;
        }
        driver.text(el, function(err, versionText) {
          if(err) {
            console.log("[%s] Could not see test inside element".red, cfg.name,err);
            callback(false);
          }

          var versionMatch = versionText.match(/[0-9]+(\.[0-9]+)*/);
          var version = versionMatch && versionMatch[0];
          console.log("[%s] Detected jasmine version %s".cyan, cfg.name, version);

          var descriptionResultParser = {
            "resultClass": "description",
            "success": /0 failures/,
            "fail": /([1-9][0-9]*)\s*failure/
          };
          var alertResultParser = {
            "resultClass": "alert",
            "success": /Passing/,
            "fail": /Failing/
          };
          var resultParser = {
            "1.2.0": descriptionResultParser,
            "1.3.0": alertResultParser,
            "1.3.1": alertResultParser
          };


          var showDetailedError = function (callback) {
            driver.elementById('details', function(err, detailEl) {
              driver.text(detailEl, function (err, detailText) {
                console.log("\n%s", detailText.red);
                callback();
              });
            });
          };

          driver.elementsByClassName(resultParser[version].resultClass, function(err, els) {
            if(err) {
              console.log("[%s] Could not get element by id".red, cfg.name, err);
              callback(false);
              return;
            }
            console.log("Fetched test result element, waiting for text inside it to change to complete".cyan);
            var el = els[0];
            var retryCount = 0;
            (function isCompleted() {
              driver.text(el, function(err, text) {
                if(err) {
                  console.log("[%s] Could not see test inside element".red, cfg.name,err);
                  callback(false);
                } else if(retryCount * testInterval > testTimeout) {
                  console.log("[%s] Failed, waited for more than %s milliseconds".red, cfg.name,testTimeout);
                  callback(false);
                } else if(text.match(resultParser[version].fail)) {
                  console.log("[%s] => Tests ran result %s".red, cfg.name,text);
                  if (detailedError) {
                    return showDetailedError(function () {
                      callback(false);
                    });
                  }
                  callback(false);
                } else if(text.match(resultParser[version].success)) {
                  console.log("[%s] => Tests ran result %s".green, cfg.name,text);
                  callback(true);
                } else if(++retryCount * testInterval <= testTimeout) {
                  console.log("[%s] %s. Still running, Time passed - %s of %s milliseconds".yellow, cfg.name, retryCount, testInterval * retryCount, testTimeout);
                  setTimeout(isCompleted, testInterval);
                }
              });
            }());
          });
        });
      });
    });
  };

  TestRunner.prototype.qunitRunner = function(driver, cfg, testTimeout, testInterval, testReadyTimeout, detailedError, pageurl, callback) {
    var testResult = "qunit-testresult";
    grunt.log.writeln("[%s] Starting QUnit tests", cfg.name);
    driver.waitForElementById(testResult, testReadyTimeout, function() {
      grunt.verbose.writeln("[%s] Found element '#%s', fetching...", cfg.name, testResult);
      driver.elementById(testResult, function(err, el) {
        if(err) {
          grunt.log.error("[%s] Element '#%s' no longer exists %s", cfg.name, testResult, err);
          callback(false);
          return;
        }
        grunt.verbose.writeln("[%s] Fetched element, waiting for tests to complete", cfg.name);
        var retryCount = 0;

        var formatTestData = function(str) {
          return String(str).split('\n').map(function(s) { return s.magenta; }).join('\n');
        };

        var showDetailedError = function (report) {
          var prevTest,
            errorReport = [];
          if (report && report.results) {
            errorReport.push('= Page: ' + report.name);
            report.results.forEach(function (assertion) {
              if (prevTest !== assertion.test) {
                errorReport.push('== Test: ' + assertion.test);
              }
              errorReport.push( '=== Assertion: ' + formatTestData(assertion.message));
              if (assertion.actual !== assertion.expected) {
                errorReport.push(
                  'Actual: ' + formatTestData(assertion.actual),
                  'Expected: ' + formatTestData(assertion.expected)
                );
              }
              if (assertion.source) {
                errorReport.push(
                  'Source:',
                  assertion.source.replace(/ {4}(at)/g, '  $1')
                );
              }
              prevTest = assertion.test;
            });
            delete report.results;
            grunt.log.error(errorReport.join('\n'));
          } else {
            grunt.log.error("Unable to generate detailed error report", report);
          }
        };

        var fetchResults = function(cb) {
          driver.safeEval("window.gruntsaucelabs_qunit_report", function(err, obj) {
            if (err) {
              grunt.log.error(err);
            }
            cb(obj);
          });
        };

        (function isCompleted() {
          driver.text(el, function(err, text) {
            if(err) {
              grunt.log.error("[%s] Unable to read text of element", cfg.name, err);
              callback(false);
              return;
            }
            if(!text.match(/completed/) ) {
              if(++retryCount * testInterval <= testTimeout) {
                grunt.verbose.writeln("[%s] Still waiting (attempt %s), Time passed - %s of %s milliseconds. %s", cfg.name, retryCount, testInterval * retryCount, testTimeout, text);
                setTimeout(isCompleted, testInterval);
              } else {
                grunt.log.error("[%s] Timed out, waited for more than %s milliseconds", cfg.name, testTimeout);
                callback(false);
              }
              return;
            }
            var x = text.split(/\n|of|,/);
            if(parseInt(x[1], 10) !== parseInt(x[2], 10)) {
              if (detailedError) {
                fetchResults(function (obj) {
                  grunt.log.error("[%s] %s: Failed".red + '\n%s', cfg.name, pageurl, text);
                  showDetailedError(obj);
                  callback(false);
                });
              } else {
                grunt.log.error("[%s] %s: Failed".red + '\n%s', cfg.name, pageurl, text);
                callback(false);
              }
            } else {
              grunt.log.ok("[%s] %s: Success\n".green + '\n%s', cfg.name, pageurl, text);
              callback(true);
            }
          });
        }());
      });
    });
  };

  function defaults(data) {
    var result = {}, build = Math.floor((new Date()).getTime() / 1000 - 1230768000).toString();
    result.url = data.url || data.urls;
    if(_.isArray(result.url)) {
      result.pages = result.url;
    } else {
      result.pages = [result.url];
    }

    result.username = data.username || process.env.SAUCE_USERNAME;
    result.key = data.key || process.env.SAUCE_ACCESS_KEY;
    result.identifier = data.build || build;
    result.tunneled = typeof data.tunneled !== 'undefined' ? data.tunneled : true;
    result.tunnelTimeout = data.tunnelTimeout || 120;
    result.testTimeout = data.testTimeout || (1000 * 60 * 5);
    result.testInterval = data.testInterval || (1000 * 5);
    result.testReadyTimeout = data.testReadyTimeout || (1000 * 5);
    result.onTestComplete = data.onTestComplete;
    result.detailedError = data.detailedError || false;

    _.map(data.browsers, function(d) {
      d.name = d.name || data.testname || "";
      d.tags = d.tags || data.tags || [];
      d.build = data.build || build;
      if (result.tunneled) {
        d['tunnel-identifier'] = data.build || build;
      }
    });
    result.configs = data.browsers || [{}];
    result.concurrency = data.concurrency || result.configs.length;
    return result;
  }

  grunt.registerMultiTask('saucelabs-jasmine', 'Run Jasmine test cases using Sauce Labs browsers', function() {
    var done = this.async(),
      arg = defaults(this.data);
    var tunnel = new SauceTunnel(arg.username, arg.key, arg.identifier, arg.tunneled, arg.tunnelTimeout);
    if (this.tunneled) {
      console.log("=> Starting Tunnel to Sauce Labs".inverse.bold);
    }
    tunnel.start(function(isCreated) {
      if(!isCreated) {
        done(false);
      }
      var test = new TestRunner(arg.username, arg.key);
      test.forEachBrowser(arg.configs, test.jasmineRunner, null, arg.concurrency, arg.onTestComplete).testPages(arg.pages, arg.testTimeout, arg.testInterval, arg.testReadyTimeout, arg.detailedError, function(status) {
        grunt.log[status ? 'ok' : 'error']("Accumulated status of all tests: %s", status);
        tunnel.stop(function() {
          done(status);
        });
      });
    });
  });

  grunt.registerMultiTask('saucelabs-qunit', 'Run Qunit test cases using Sauce Labs browsers', function() {
    var done = this.async(),
      arg = defaults(this.data);
    var tunnel = new SauceTunnel(arg.username, arg.key, arg.identifier, arg.tunneled, arg.tunnelTimeout);
    if (this.tunneled) {
      console.log("=> Starting Tunnel to Sauce Labs".inverse.bold);
    }
    tunnel.start(function(isCreated) {
      if(!isCreated) {
        done(false);
      }
      var test = new TestRunner(arg.username, arg.key);
      test.forEachBrowser(arg.configs, test.qunitRunner, null, arg.concurrency, arg.onTestComplete).testPages(arg.pages, arg.testTimeout, arg.testInterval, arg.testReadyTimeout, arg.detailedError, function(status) {
        grunt.log[status ? 'ok' : 'error']("Accumulated status of all tests: %s", status);
        tunnel.stop(function() {
          done(status);
        });
      });
    });
  });
};
