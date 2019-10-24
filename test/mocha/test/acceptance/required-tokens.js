const assert = require('assert');
const describe = require('../..').describe;
const it = require('../..').it;

describe('using imported describe', function() {
  it('using imported it', function(done) {
    assert.ok(true);
    done();
  });
});
