
/**
 * Module dependencies.
 */

const Base = require('./base')
  ; const cursor = Base.cursor
  ; const color = Base.color;

/**
 * Expose `JSON`.
 */

exports = module.exports = JSONReporter;

/**
 * Initialize a new `JSON` reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function JSONReporter(runner) {
  const self = this;
  Base.call(this, runner);

  const tests = []
    ; const failures = []
    ; const passes = [];

  runner.on('test end', function(test) {
    tests.push(test);
  });

  runner.on('pass', function(test) {
    passes.push(test);
  });

  runner.on('fail', function(test) {
    failures.push(test);
  });

  runner.on('end', function() {
    const obj = {
      stats: self.stats,
      tests: tests.map(clean),
      failures: failures.map(clean),
      passes: passes.map(clean),
    };

    process.stdout.write(JSON.stringify(obj, null, 2));
  });
}

/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @param {Object} test
 * @return {Object}
 * @api private
 */

function clean(test) {
  return {
    title: test.title,
    fullTitle: test.fullTitle(),
    duration: test.duration,
  };
}
