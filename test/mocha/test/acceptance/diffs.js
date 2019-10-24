
const fs = require('fs')
  ; const cssin = fs.readFileSync('test/acceptance/fixtures/css.in', 'ascii')
  ; const cssout = fs.readFileSync('test/acceptance/fixtures/css.out', 'ascii');

describe('diffs', function() {
  // uncomment the assertions, and run with different params to check the output
  // ex: --color, --no-color, --unified-diff

  it('should display a diff for small strings', function() {
    const expected = 'foo bar baz'
      ; const actual = 'foo rar baz';

    // expected.should.eql(actual);
  });

  it('should display a diff of canonicalized objects', function() {
    const actual = {name: 'travis j', age: 23}
      ; const expected = {age: 23, name: 'travis'};

    // actual.should.eql(expected);
  });

  it('should display a diff for medium strings', function() {
    const expected = 'foo bar baz\nfoo bar baz\nfoo bar baz'
      ; const actual = 'foo bar baz\nfoo rar baz\nfoo bar raz';

    // expected.should.eql(actual);
  });

  it('should display a diff for entire object dumps', function() {
    const expected = {name: 'joe', age: 30, address: {city: 'new york', country: 'us'}}
      ; const actual = {name: 'joel', age: 30, address: {city: 'new york', country: 'usa'}};

    // actual.should.eql(expected);
  });

  it('should display a diff for multi-line strings', function() {
    const expected = 'one two three\nfour five six\nseven eight nine';
    const actual = 'one two three\nfour zzzz six\nseven eight nine';

    // actual.should.eql(expected);
  });

  it('should display a diff for entire object dumps', function() {
    const expected = {name: 'joe', age: 30, address: {city: 'new york', country: 'us'}};
    const actual = {name: 'joel', age: 30, address: {city: 'new york', country: 'usa'}};

    // actual.should.eql(expected);
  });

  it('should display a full-comparison with escaped special characters', function() {
    const expected = 'one\ttab\ntwo\t\ttabs';
    const actual = 'one\ttab\ntwo\t\t\ttabs';

    // actual.should.equal(expected);
  });

  it('should display a word diff for large strings', function() {
    // cssin.should.equal(cssout);
  });

  it('should work with objects', function() {
    const tobi = {
      name: 'tobi',
      species: 'ferret',
      color: 'white',
      age: 2,
    };

    const loki = {
      name: 'loki',
      species: 'ferret',
      color: 'brown',
      age: 2,
    };

    // tobi.should.eql(loki);
  });
});
