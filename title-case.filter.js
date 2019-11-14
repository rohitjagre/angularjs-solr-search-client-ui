(function() {
  "use strict";

  // Usage:
  //
  // Creates:
  //

  angular.module("solrSearchClient").filter("titleCase", function() {
    return function(input, skipCapitalCase) {
      input = input || "";
      if (skipCapitalCase) {
        input = input.replace(/([A-Z])/g, " $1");
      }
      return input.replace("_", " ").replace(/\w\S*/g, function(txt) {
        var result = txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        return result;
      });
    };
  });
})();
