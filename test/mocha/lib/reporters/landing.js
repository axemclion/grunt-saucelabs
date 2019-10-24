
/**
 * Module dependencies.
 */

const Base = require('./base')
  ; const cursor = Base.cursor
  ; const color = Base.color;

/**
 * Expose `Landing`.
 */

exports = module.exports = Landing;

/**
 * Airplane color.
 */

Base.colors.plane = 0;

/**
 * Airplane crash color.
 */

Base.colors['plane crash'] = 31;

/**
 * Runway color.
 */

Base.colors.runway = 90;

/**
 * Initialize a new `Landing` reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function Landing(runner) {
  Base.call(this, runner);

  const self = this
    ; const stats = this.stats
    ; const width = Base.window.width * .75 | 0
    ; const total = runner.total
    ; const stream = process.stdout
    ; let plane = color('plane', '✈')
    ; let crashed = -1
    ; let n = 0;

  function runway() {
    const buf = Array(width).join('-');
    return '  ' + color('runway', buf);
  }

  runner.on('start', function() {
    stream.write('\n  ');
    cursor.hide();
  });

  runner.on('test end', function(test) {
    // check if the plane crashed
    const col = -1 == crashed ?
      width * ++n / total | 0 :
      crashed;

    // show the crash
    if ('failed' == test.state) {
      plane = color('plane crash', '✈');
      crashed = col;
    }

    // render landing strip
    stream.write('\u001b[4F\n\n');
    stream.write(runway());
    stream.write('\n  ');
    stream.write(color('runway', Array(col).join('⋅')));
    stream.write(plane);
    stream.write(color('runway', Array(width - col).join('⋅') + '\n'));
    stream.write(runway());
    stream.write('\u001b[0m');
  });

  runner.on('end', function() {
    cursor.show();
    console.log();
    self.epilogue();
  });
}

/**
 * Inherit from `Base.prototype`.
 */

Landing.prototype.__proto__ = Base.prototype;
