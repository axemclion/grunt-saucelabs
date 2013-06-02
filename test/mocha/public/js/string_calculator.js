window.StringCalculator = StringCalculator = {
  add: function(inputString) {
    if(inputString === '') {
      return 0;
    }

    var result = 0;
    var inputStrings = inputString.split(',');

    for(var i=0; i<inputStrings.length; i++) {
      result += parseInt(inputStrings[i]);
    }

    return result;
  }
}
