
describe('should only run .only test in this bdd suite', function() {
  it('should not run this test', function() {
    const zero = 0;
    zero.should.equal(1, 'this test should have been skipped');
  });
  it.only('should run this test', function() {
    const zero = 0;
    zero.should.equal(0, 'this .only test should run');
  });
  it('should run this test, not (includes the title of the .only test)', function() {
    const zero = 0;
    zero.should.equal(1, 'this test should have been skipped');
  });
});
