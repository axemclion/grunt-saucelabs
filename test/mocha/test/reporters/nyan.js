const reporters = require('../../').reporters
   ; const NyanCat = reporters.Nyan;


describe('nyan face', function() {
  it('nyan face:(x .x) when "failures" at least one', function() {
    const nyanCat = new NyanCat({on: function() {}});
    nyanCat.stats = {passes: 2, pending: 1, failures: 1};
    nyanCat.face.call(nyanCat).should.equal('( x .x)');
  });

  it('expected nyan face:(x .x) when "peinding" at least one and no failing', function() {
    const nyanCat = new NyanCat({on: function() {}});
    nyanCat.stats = {passes: 2, pending: 1, failures: 0};
    nyanCat.face.call(nyanCat).should.equal('( o .o)');
  });

  it('expected nyan face:(^ .^) when "passing" only', function() {
    const nyanCat = new NyanCat({on: function() {}});
    nyanCat.stats = {passes: 1, pending: 0, failures: 0};
    nyanCat.face.call(nyanCat).should.equal('( ^ .^)');
  });

  it('nyan face:(- .-) when otherwise', function(done) {
    const nyanCat = new NyanCat({on: function() {}});
    nyanCat.stats = {passes: 0, pending: 0, failures: 0};
    nyanCat.face.call(nyanCat).should.equal('( - .-)');
    done();
  });
});
