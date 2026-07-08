'use strict';

// Replaces the abandoned grunt-sauce-tunnel plugin (last published 2014,
// permanently pinned to a grunt ~0.4.4 peer dependency, which blocked the
// grunt 1.x upgrade). sauce-tunnel itself is already a runtime dependency
// of this project - it's the library grunt-sauce-tunnel used to wrap - so
// these two tasks just drive it directly with the same options shape
// (grunt/sauce_tunnel.js / grunt/sauce_tunnel_stop.js) that load-grunt-config
// was already supplying.

module.exports = function (grunt) {
  var SauceTunnel = require('sauce-tunnel');
  var activeTunnels = {};

  grunt.registerMultiTask('sauce_tunnel', 'Start a Sauce Connect tunnel', function () {
    var done = this.async();
    var options = this.options();

    var tunnel = new SauceTunnel(options.username, options.key, options.identifier, true);
    activeTunnels[options.identifier] = tunnel;

    tunnel.start(function (status) {
      if (status === false) {
        done(new Error('Could not start Sauce Connect tunnel'));
        return;
      }
      done();
    });
  });

  grunt.registerMultiTask('sauce_tunnel_stop', 'Stop a Sauce Connect tunnel', function () {
    var done = this.async();
    var options = this.options();
    var tunnel = activeTunnels[options.identifier];

    if (!tunnel) {
      done();
      return;
    }

    tunnel.stop(function () {
      delete activeTunnels[options.identifier];
      done();
    });
  });
};
