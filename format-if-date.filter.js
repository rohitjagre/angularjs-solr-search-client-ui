(function() {
  "use strict";

  // Usage:
  //
  // Creates:
  //

  angular.module("solrSearchClient").filter("formatIfDate", [
    "UtilsService",
    function(utilsService) {
      return function(input, skipDateCheck) {
        var text = input || "";

        if (skipDateCheck) {
          return utilsService.formatDate(text);
        }

        if (moment(text, "YYYY-MM-DDThh:mm:ss.SSSZ", true).isValid()) {
          return utilsService.formatDate(text);
        }

        return text;
      };
    }
  ]);
})();
