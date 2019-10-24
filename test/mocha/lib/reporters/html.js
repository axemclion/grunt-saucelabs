
/**
 * Module dependencies.
 */

const Base = require('./base')
  ; const utils = require('../utils')
  ; const Progress = require('../browser/progress')
  ; const escape = utils.escape;

/**
 * Save timer references to avoid Sinon interfering (see GH-237).
 */

const Date = global.Date
  ; const setTimeout = global.setTimeout
  ; const setInterval = global.setInterval
  ; const clearTimeout = global.clearTimeout
  ; const clearInterval = global.clearInterval;

/**
 * Expose `HTML`.
 */

exports = module.exports = HTML;

/**
 * Stats template.
 */

const statsTemplate = '<ul id="mocha-stats">' +
  '<li class="progress"><canvas width="40" height="40"></canvas></li>' +
  '<li class="passes"><a href="#">passes:</a> <em>0</em></li>' +
  '<li class="failures"><a href="#">failures:</a> <em>0</em></li>' +
  '<li class="duration">duration: <em>0</em>s</li>' +
  '</ul>';

/**
 * Initialize a new `HTML` reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function HTML(runner, root) {
  Base.call(this, runner);

  const self = this
    ; const stats = this.stats
    ; const total = runner.total
    ; const stat = fragment(statsTemplate)
    ; const items = stat.getElementsByTagName('li')
    ; const passes = items[1].getElementsByTagName('em')[0]
    ; const passesLink = items[1].getElementsByTagName('a')[0]
    ; const failures = items[2].getElementsByTagName('em')[0]
    ; const failuresLink = items[2].getElementsByTagName('a')[0]
    ; const duration = items[3].getElementsByTagName('em')[0]
    ; const canvas = stat.getElementsByTagName('canvas')[0]
    ; const report = fragment('<ul id="mocha-report"></ul>')
    ; const stack = [report]
    ; let progress
    ; let ctx;

  root = root || document.getElementById('mocha');

  if (canvas.getContext) {
    const ratio = window.devicePixelRatio || 1;
    canvas.style.width = canvas.width;
    canvas.style.height = canvas.height;
    canvas.width *= ratio;
    canvas.height *= ratio;
    ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    progress = new Progress;
  }

  if (!root) return error('#mocha div missing, add it to your document');

  // pass toggle
  on(passesLink, 'click', function() {
    unhide();
    const name = /pass/.test(report.className) ? '' : ' pass';
    report.className = report.className.replace(/fail|pass/g, '') + name;
    if (report.className.trim()) hideSuitesWithout('test pass');
  });

  // failure toggle
  on(failuresLink, 'click', function() {
    unhide();
    const name = /fail/.test(report.className) ? '' : ' fail';
    report.className = report.className.replace(/fail|pass/g, '') + name;
    if (report.className.trim()) hideSuitesWithout('test fail');
  });

  root.appendChild(stat);
  root.appendChild(report);

  if (progress) progress.size(40);

  runner.on('suite', function(suite) {
    if (suite.root) return;

    // suite
    const url = self.suiteURL(suite);
    const el = fragment('<li class="suite"><h1><a href="%s">%s</a></h1></li>', url, escape(suite.title));

    // container
    stack[0].appendChild(el);
    stack.unshift(document.createElement('ul'));
    el.appendChild(stack[0]);
  });

  runner.on('suite end', function(suite) {
    if (suite.root) return;
    stack.shift();
  });

  runner.on('fail', function(test, err) {
    if ('hook' == test.type) runner.emit('test end', test);
  });

  runner.on('test end', function(test) {
    // TODO: add to stats
    const percent = stats.tests / this.total * 100 | 0;
    if (progress) progress.update(percent).draw(ctx);

    // update stats
    const ms = new Date - stats.start;
    text(passes, stats.passes);
    text(failures, stats.failures);
    text(duration, (ms / 1000).toFixed(2));

    // test
    if ('passed' == test.state) {
      const url = self.testURL(test);
      var el = fragment('<li class="test pass %e"><h2>%e<span class="duration">%ems</span> <a href="%s" class="replay">‣</a></h2></li>', test.speed, test.title, test.duration, url);
    } else if (test.pending) {
      var el = fragment('<li class="test pass pending"><h2>%e</h2></li>', test.title);
    } else {
      var el = fragment('<li class="test fail"><h2>%e <a href="?grep=%e" class="replay">‣</a></h2></li>', test.title, encodeURIComponent(test.fullTitle()));
      let str = test.err.stack || test.err.toString();

      // FF / Opera do not add the message
      if (!~str.indexOf(test.err.message)) {
        str = test.err.message + '\n' + str;
      }

      // <=IE7 stringifies to [Object Error]. Since it can be overloaded, we
      // check for the result of the stringifying.
      if ('[object Error]' == str) str = test.err.message;

      // Safari doesn't give you a stack. Let's at least provide a source line.
      if (!test.err.stack && test.err.sourceURL && test.err.line !== undefined) {
        str += '\n(' + test.err.sourceURL + ':' + test.err.line + ')';
      }

      el.appendChild(fragment('<pre class="error">%e</pre>', str));
    }

    // toggle code
    // TODO: defer
    if (!test.pending) {
      const h2 = el.getElementsByTagName('h2')[0];

      on(h2, 'click', function() {
        pre.style.display = 'none' == pre.style.display ?
          'block' :
          'none';
      });

      var pre = fragment('<pre><code>%e</code></pre>', utils.clean(test.fn.toString()));
      el.appendChild(pre);
      pre.style.display = 'none';
    }

    // Don't call .appendChild if #mocha-report was already .shift()'ed off the stack.
    if (stack[0]) stack[0].appendChild(el);
  });
}

/**
 * Provide suite URL
 *
 * @param {Object} [suite]
 */

HTML.prototype.suiteURL = function(suite) {
  return '?grep=' + encodeURIComponent(suite.fullTitle());
};

/**
 * Provide test URL
 *
 * @param {Object} [test]
 */

HTML.prototype.testURL = function(test) {
  return '?grep=' + encodeURIComponent(test.fullTitle());
};

/**
 * Display error `msg`.
 */

function error(msg) {
  document.body.appendChild(fragment('<div id="mocha-error">%s</div>', msg));
}

/**
 * Return a DOM fragment from `html`.
 */

function fragment(html) {
  const args = arguments
    ; const div = document.createElement('div')
    ; let i = 1;

  div.innerHTML = html.replace(/%([se])/g, function(_, type) {
    switch (type) {
      case 's': return String(args[i++]);
      case 'e': return escape(args[i++]);
    }
  });

  return div.firstChild;
}

/**
 * Check for suites that do not have elements
 * with `classname`, and hide them.
 */

function hideSuitesWithout(classname) {
  const suites = document.getElementsByClassName('suite');
  for (let i = 0; i < suites.length; i++) {
    const els = suites[i].getElementsByClassName(classname);
    if (0 == els.length) suites[i].className += ' hidden';
  }
}

/**
 * Unhide .hidden suites.
 */

function unhide() {
  const els = document.getElementsByClassName('suite hidden');
  for (let i = 0; i < els.length; ++i) {
    els[i].className = els[i].className.replace('suite hidden', 'suite');
  }
}

/**
 * Set `el` text to `str`.
 */

function text(el, str) {
  if (el.textContent) {
    el.textContent = str;
  } else {
    el.innerText = str;
  }
}

/**
 * Listen on `event` with callback `fn`.
 */

function on(el, event, fn) {
  if (el.addEventListener) {
    el.addEventListener(event, fn, false);
  } else {
    el.attachEvent('on' + event, fn);
  }
}
