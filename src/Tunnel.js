'use strict';

var SauceTunnel = require('sauce-tunnel');
var Q = require('q');
var notifications = require('./notifications');

/**
 * Abstraction over sauce-tunnel. This one has methods which return promises.
 *
 * @constructor
 * @param {Object} properties - Configuration options.
 * @param {Function} onProgress - Progress handler.
 */
var Tunnel = function (properties, onProgress) {
  this.id = properties.identifier;
  this.user = properties.username;
  this.key = properties.key;
  this.tunnelArgs = ['-P', '0'].concat(properties.tunnelArgs);
  this.tunnel = null;
  this.opened = false;
  this.onProgress = onProgress;
};

/**
 * Reports progress.
 * @param {Object} progress - Progress data.
 */
Tunnel.prototype.reportProgress = function (progress) {
  if (this.onProgress) {
    this.onProgress(progress);
  }
};

/**
 * Opens the tunnel.
 * @returns {Object} - A promise which will be resolved after the tunnel has been
 *   successfully opened.
 */
Tunnel.prototype.open = function () {
  var me = this;
  var deferred = Q.defer();

  this.reportProgress({
    type: notifications.tunnelOpen
  });

  this.tunnel = new SauceTunnel(me.user, me.key, me.id, true, me.tunnelArgs);
  ['write', 'writeln', 'error', 'ok', 'debug'].forEach(function (method) {
    this.tunnel.on('log:' + method, function (text) {
      me.reportProgress({
        type: notifications.tunnelEvent,
        verbose: false,
        method: method,
        text: text
      });
    });
    this.tunnel.on('verbose:' + method, function (text) {
      me.reportProgress({
        type: notifications.tunnelEvent,
        verbose: true,
        method: method,
        text: text
      });
    });
  }, this);

  this.tunnel.start(function (succeeded) {
    if (!succeeded) {
      deferred.reject('Could not create tunnel to Sauce Labs');
    } else {
      me.reportProgress({
        type: notifications.tunnelOpened
      });

      me.opened = true;
      deferred.resolve();
    }
  });

  return deferred.promise;
};

/**
 * Closes the tunnel.
 *
 * @returns {Object} - A promise which will be resolved after the tunnel has been
 *   successfully closed.
 */
Tunnel.prototype.close = function () {
  var me = this;
  var deferred = Q.defer();

  if (this.opened) {
    this.reportProgress({
      type: notifications.tunnelClose
    });

    this.tunnel.stop(function () {
      me.opened = false;
      deferred.resolve();
    });

    return deferred.promise;
  }
};

module.exports = Tunnel;