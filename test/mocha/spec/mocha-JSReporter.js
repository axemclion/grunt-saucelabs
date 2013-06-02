// usage:
// mocha.setup({"ui":"qunit", "reporter":JSReporter});

function JSReporter(runner) {

  function clean(test) {
  return {
      title: test.title
    , fullTitle: test.fullTitle()
    , duration: test.duration
    }
  };

  var self = this;
  Mocha.reporters.HTML.call(this, runner);

  var suites = {}
    , stack = new Array()
    , rootSuite = null;


  var createSuiteElement = function(suite) {
    return {
        description: suite.title
      , durationSec: 0
      , specs: []
      , suites: []
      , passed: null
    }
  }
  runner.on('suite', function(suite){
    var newSuite = createSuiteElement(suite)
    if (stack.length>0){
      stack[0].suites.push(newSuite);
    } else {
      rootSuite = newSuite;
    }
    stack.unshift(newSuite);
  });

  runner.on('suite end', function(suite){

    //calculate if suite is passed

    var passed = true;
    var durationSec = 0;
    var suite = stack[0];
    for (var i=0; i<suite.specs.length; i++) {
      passed = passed && suite.specs[i].passed;
      durationSec += suite.specs[i].durationSec;
    };
    for (var i=0; i<suite.suites.length; i++) {
      passed = passed && suite.suites[i].passed;
      durationSec += suite.suites[i].durationSec;
    }
    suite.passed = passed;
    suite.durationSec = durationSec;

    stack.shift();

  });


  runner.on('test end', function(test){
    stack[0].specs.push({
        description: test.title
      , durationSec: test.duration/1000
      , passed: test.state=="passed"
    });
  });


  runner.on('end', function(){
    var stats =self.stats;

    mocha.getJSReport = function() {
      var suites =[];
      return rootSuite;
    };
  });
}