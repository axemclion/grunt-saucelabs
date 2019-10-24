/**
 * Module dependencies.
 */

const Base = require('./base')
  ; const color = Base.color;

/**
 * Expose `Dot`.
 */

exports = module.exports = NyanCat;

/**
 * Initialize a new `Dot` matrix test reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function NyanCat(runner) {
  Base.call(this, runner);
  const self = this
    ; const stats = this.stats
    ; const width = Base.window.width * .75 | 0
    ; const rainbowColors = this.rainbowColors = self.generateColors()
    ; const colorIndex = this.colorIndex = 0
    ; const numerOfLines = this.numberOfLines = 4
    ; const trajectories = this.trajectories = [[], [], [], []]
    ; const nyanCatWidth = this.nyanCatWidth = 11
    ; const trajectoryWidthMax = this.trajectoryWidthMax = (width - nyanCatWidth)
    ; const scoreboardWidth = this.scoreboardWidth = 5
    ; const tick = this.tick = 0
    ; const n = 0;

  runner.on('start', function() {
    Base.cursor.hide();
    self.draw();
  });

  runner.on('pending', function(test) {
    self.draw();
  });

  runner.on('pass', function(test) {
    self.draw();
  });

  runner.on('fail', function(test, err) {
    self.draw();
  });

  runner.on('end', function() {
    Base.cursor.show();
    for (let i = 0; i < self.numberOfLines; i++) write('\n');
    self.epilogue();
  });
}

/**
 * Draw the nyan cat
 *
 * @api private
 */

NyanCat.prototype.draw = function() {
  this.appendRainbow();
  this.drawScoreboard();
  this.drawRainbow();
  this.drawNyanCat();
  this.tick = !this.tick;
};

/**
 * Draw the "scoreboard" showing the number
 * of passes, failures and pending tests.
 *
 * @api private
 */

NyanCat.prototype.drawScoreboard = function() {
  const stats = this.stats;
  const colors = Base.colors;

  function draw(color, n) {
    write(' ');
    write('\u001b[' + color + 'm' + n + '\u001b[0m');
    write('\n');
  }

  draw(colors.green, stats.passes);
  draw(colors.fail, stats.failures);
  draw(colors.pending, stats.pending);
  write('\n');

  this.cursorUp(this.numberOfLines);
};

/**
 * Append the rainbow.
 *
 * @api private
 */

NyanCat.prototype.appendRainbow = function() {
  const segment = this.tick ? '_' : '-';
  const rainbowified = this.rainbowify(segment);

  for (let index = 0; index < this.numberOfLines; index++) {
    const trajectory = this.trajectories[index];
    if (trajectory.length >= this.trajectoryWidthMax) trajectory.shift();
    trajectory.push(rainbowified);
  }
};

/**
 * Draw the rainbow.
 *
 * @api private
 */

NyanCat.prototype.drawRainbow = function() {
  const self = this;

  this.trajectories.forEach(function(line, index) {
    write('\u001b[' + self.scoreboardWidth + 'C');
    write(line.join(''));
    write('\n');
  });

  this.cursorUp(this.numberOfLines);
};

/**
 * Draw the nyan cat
 *
 * @api private
 */

NyanCat.prototype.drawNyanCat = function() {
  const self = this;
  const startWidth = this.scoreboardWidth + this.trajectories[0].length;
  const color = '\u001b[' + startWidth + 'C';
  let padding = '';

  write(color);
  write('_,------,');
  write('\n');

  write(color);
  padding = self.tick ? '  ' : '   ';
  write('_|' + padding + '/\\_/\\ ');
  write('\n');

  write(color);
  padding = self.tick ? '_' : '__';
  const tail = self.tick ? '~' : '^';
  let face;
  write(tail + '|' + padding + this.face() + ' ');
  write('\n');

  write(color);
  padding = self.tick ? ' ' : '  ';
  write(padding + '""  "" ');
  write('\n');

  this.cursorUp(this.numberOfLines);
};

/**
 * Draw nyan cat face.
 *
 * @return {String}
 * @api private
 */

NyanCat.prototype.face = function() {
  const stats = this.stats;
  if (stats.failures) {
    return '( x .x)';
  } else if (stats.pending) {
    return '( o .o)';
  } else if (stats.passes) {
    return '( ^ .^)';
  } else {
    return '( - .-)';
  }
};

/**
 * Move cursor up `n`.
 *
 * @param {Number} n
 * @api private
 */

NyanCat.prototype.cursorUp = function(n) {
  write('\u001b[' + n + 'A');
};

/**
 * Move cursor down `n`.
 *
 * @param {Number} n
 * @api private
 */

NyanCat.prototype.cursorDown = function(n) {
  write('\u001b[' + n + 'B');
};

/**
 * Generate rainbow colors.
 *
 * @return {Array}
 * @api private
 */

NyanCat.prototype.generateColors = function() {
  const colors = [];

  for (let i = 0; i < (6 * 7); i++) {
    const pi3 = Math.floor(Math.PI / 3);
    const n = (i * (1.0 / 6));
    const r = Math.floor(3 * Math.sin(n) + 3);
    const g = Math.floor(3 * Math.sin(n + 2 * pi3) + 3);
    const b = Math.floor(3 * Math.sin(n + 4 * pi3) + 3);
    colors.push(36 * r + 6 * g + b + 16);
  }

  return colors;
};

/**
 * Apply rainbow to the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

NyanCat.prototype.rainbowify = function(str) {
  const color = this.rainbowColors[this.colorIndex % this.rainbowColors.length];
  this.colorIndex += 1;
  return '\u001b[38;5;' + color + 'm' + str + '\u001b[0m';
};

/**
 * Stdout helper.
 */

function write(string) {
  process.stdout.write(string);
}

/**
 * Inherit from `Base.prototype`.
 */

NyanCat.prototype.__proto__ = Base.prototype;
