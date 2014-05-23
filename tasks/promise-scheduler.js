/*jslint node:true*/

// copied from https://gist.github.com/gaearon/7930162

'use strict';

var q = require('q');

/**
 * Constructs a function that proxies to promiseFactory
 * limiting the count of promises that can run simultaneously.
 * @param promiseFactory function that returns promises.
 * @param limit how many promises are allowed to be running at the same time.
 * @returns function that returns a promise that eventually proxies to promiseFactory.
 */
function limitConcurrency(promiseFactory, limit) {
    var running = 0,
        semaphore;

    function scheduleNextJob() {
        if (running < limit) {
            running += 1;
            return q();
        }

        if (!semaphore) {
            semaphore = q.defer();
        }

        return semaphore.promise
            .finally(scheduleNextJob);
    }

    function processScheduledJobs() {
        running -= 1;

        if (semaphore && running < limit) {
            semaphore.resolve();
            semaphore = null;
        }
    }

    return function () {
        var _this = this,
            args = arguments;

        function runJob() {
            return promiseFactory.apply(_this, args);
        }

        return scheduleNextJob()
            .then(runJob)
            .finally(processScheduledJobs);
    };
}

module.exports = {
    limitConcurrency: limitConcurrency
};