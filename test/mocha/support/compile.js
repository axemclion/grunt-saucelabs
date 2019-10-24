
/**
 * Module dependencies.
 */

const fs = require('fs');

/**
 * Arguments.
 */

const args = process.argv.slice(2)
  ; let pending = args.length
  ; const files = {};

console.log('');

// parse arguments

args.forEach(function(file) {
  const mod = file.replace('lib/', '');
  fs.readFile(file, 'utf8', function(err, js) {
    if (err) throw err;
    console.log('  \u001b[90mcompile : \u001b[0m\u001b[36m%s\u001b[0m', file);
    files[file] = ~js.indexOf('require: off') ?
      js :
      parse(js);
    --pending || compile();
  });
});

/**
 * Parse the given `js`.
 */

function parse(js) {
  return parseRequires(parseInheritance(js));
}

/**
 * Parse requires.
 */

function parseRequires(js) {
  return js
      .replace(/require\('events'\)/g, 'require(\'browser/events\')')
      .replace(/require\('debug'\)/g, 'require(\'browser/debug\')')
      .replace(/require\('path'\)/g, 'require(\'browser/path\')')
      .replace(/require\('diff'\)/g, 'require(\'browser/diff\')')
      .replace(/require\('tty'\)/g, 'require(\'browser/tty\')')
      .replace(/require\('fs'\)/g, 'require(\'browser/fs\')');
}

/**
 * Parse __proto__.
 */

function parseInheritance(js) {
  return js
      .replace(/^ *(\w+)\.prototype\.__proto__ * = *(\w+)\.prototype *;?/gm, function(_, child, parent) {
        return 'function F(){};\n' +
        'F.prototype = ' + parent + '.prototype;\n' +
        child + '.prototype = new F;\n' +
        child + '.prototype.constructor = '+ child + ';\n';
      });
}

/**
 * Compile the files.
 */

function compile() {
  let buf = '';
  buf += '\n// CommonJS require()\n\n';
  buf += browser.require + '\n\n';
  buf += 'require.modules = {};\n\n';
  buf += 'require.resolve = ' + browser.resolve + ';\n\n';
  buf += 'require.register = ' + browser.register + ';\n\n';
  buf += 'require.relative = ' + browser.relative + ';\n\n';
  args.forEach(function(file) {
    const js = files[file];
    file = file.replace('lib/', '');
    buf += '\nrequire.register("' + file + '", function(module, exports, require){\n';
    buf += js;
    buf += '\n}); // module: ' + file + '\n';
  });
  fs.writeFile('_mocha.js', buf, function(err) {
    if (err) throw err;
    console.log('  \u001b[90m create : \u001b[0m\u001b[36m%s\u001b[0m', 'mocha.js');
    console.log();
  });
}

// refactored version of weepy's
// https://github.com/weepy/brequire/blob/master/browser/brequire.js

var browser = {

  /**
   * Require a module.
   */

  require: function require(p) {
    const path = require.resolve(p)
      ; const mod = require.modules[path];
    if (!mod) throw new Error('failed to require "' + p + '"');
    if (!mod.exports) {
      mod.exports = {};
      mod.call(mod.exports, mod, mod.exports, require.relative(path));
    }
    return mod.exports;
  },

  /**
   * Resolve module path.
   */

  resolve: function(path) {
    const orig = path
      ; const reg = path + '.js'
      ; const index = path + '/index.js';
    return require.modules[reg] && reg ||
      require.modules[index] && index ||
      orig;
  },

  /**
   * Return relative require().
   */

  relative: function(parent) {
    return function(p) {
      if ('.' != p.charAt(0)) return require(p);

      const path = parent.split('/')
        ; const segs = p.split('/');
      path.pop();

      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        if ('..' == seg) path.pop();
        else if ('.' != seg) path.push(seg);
      }

      return require(path.join('/'));
    };
  },

  /**
   * Register a module.
   */

  register: function(path, fn) {
    require.modules[path] = fn;
  },
};
