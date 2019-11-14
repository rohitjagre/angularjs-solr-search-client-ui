(function() {
  "use strict";

  // Usage:
  //
  // Creates:
  //

  angular.module("solrSearchClient").component("solrSearch", {
    templateUrl: "solr-search.component.html",
    controllerAs: "solrSearchCtrl",
    bindings: {},
    controller: solrSearchController
  });

  solrSearchController.$inject = ["$rootScope", "toastr", "SolrSearchService"];

  function solrSearchController($rootScope, toastr, solrSearchService) {
    var vm = this;

    vm.minDate = moment("1980-01-01T00:00:00.000Z");
    vm.today = moment();

    vm.searchOptions = {
      rows: 10,
      currentPage: 1,
      operator: "AND",
      query: "",
      dateRangeGap: 2,
      dateRangeUnit: "YEAR",
      StartDateValue: vm.minDate,
      EndDateValue: vm.today
    };

    // Slider
    // https://angular-slider.github.io/angularjs-slider/
    vm.slider = {
      options: {
        floor: 0,
        ceil: 10,
        step: 1,
        minLimit: 1,
        maxLimit: 9
      }
    };

    vm.collapsedFacets = {};
    vm.selectedFacets = {};
    vm.selectedFacetsList = [];

    vm.termsFacetsList = [];
    vm.dateRangeFacetsList = [];
    vm.response = {};
    vm.stats = {};

    vm.search = search;
    vm.isFieldVisible = isFieldVisible;
    vm.toggleFacet = toggleFacet;
    vm.min = min;
    vm.isEmptyObject = isEmptyObject;
    vm.resetFilters = resetFilters;

    function search() {
      var query = "";

      // text box query
      if (vm.searchOptions.query) {
        query = vm.searchOptions.query;
      }

      // Add the fields from you Solr here to get their Facet values
      var termFacets = [];

      var rangeFacets = [];

      var statFacets = [];

      solrSearchService
        .search(
          query,
          vm.selectedFacetsList,
          vm.searchOptions,
          termFacets,
          vm.searchOptions,
          rangeFacets,
          statFacets
        )
        .then(function(data) {
          var termFacets = data.facet_counts && data.facet_counts.facet_fields;
          if (termFacets) {
            vm.termsFacetsList = formatTermsFacetFromFacetFields(termFacets);
          }

          var rangeFacets = data.facet_counts && data.facet_counts.facet_ranges;

          if (rangeFacets) {
            vm.dateRangeFacetsList = formatRangeFacetFromFacetFields(
              rangeFacets
            );
          }

          vm.stats = data.stats;

          vm.response = data.response; // data.grouped && data.grouped.Type_str && data.grouped.Type_str.groups -> Results for Grouped Search

          // Group response by their type -> You may or may not need this if you don't have categorical data, please look at the response and decide on basis of that
          var docs = {};
          data.response.docs.forEach(function(e) {
            if (!docs[e.Type]) {
              docs[e.Type] = [e];
            } else {
              docs[e.Type].push(e);
            }
          });

          vm.response.docs = docs;
        })
        .catch(function(err) {
          if (err.status === 400) {
            //   angularjs toastr library
            toastr.error(err.data.error.msg, "Invalid Query", {
              timeOut: 5000
            });
          }
        });
    }

    //   Get String Representation to show on Facet UI
    function getDateRepresentationBasisOnGapUnit(dateObj, gapUnit) {
      switch (gapUnit.toLowerCase()) {
        case "year":
          return moment(dateObj).format("YYYY");
        case "month":
          return moment(dateObj).format("MMM YYYY");
        case "day":
          return moment(dateObj).format("DD/MM/YYYY");
        default:
          return moment(dateObj).format("YYYY");
      }
    }

    function formatRangeFacetFromFacetFields(rangeFacetFieldsArray) {
      var facetsList = [];
      for (var field in rangeFacetFieldsArray) {
        var facetsKeyValues = [];
        var facetDetailsObj = rangeFacetFieldsArray[field];
        for (var i = 0; i < facetDetailsObj.counts.length; i += 2) {
          var start = facetDetailsObj.counts[i];
          var end = moment(facetDetailsObj.counts[i])
            .add(
              vm.searchOptions.dateRangeGap - 1,
              vm.searchOptions.dateRangeUnit
            )
            .toISOString();

          var startStr = getDateRepresentationBasisOnGapUnit(
            moment(facetDetailsObj.counts[i]),
            vm.searchOptions.dateRangeUnit
          );
          var endStr = getDateRepresentationBasisOnGapUnit(
            moment(facetDetailsObj.counts[i]).add(
              vm.searchOptions.dateRangeGap - 1,
              vm.searchOptions.dateRangeUnit
            ),
            vm.searchOptions.dateRangeUnit
          );

          var count = facetDetailsObj.counts[i + 1];
          facetsKeyValues.push({
            start: start,
            end: end,
            count: count,
            startStr: startStr,
            endStr: endStr
          });
        }

        facetsList.push({
          name: field.replace("_str", ""),
          value: facetsKeyValues,
          start: facetDetailsObj.start,
          end: facetDetailsObj.end,
          gap: facetDetailsObj.gap
        });
      }

      return facetsList;
    }

    function formatTermsFacetFromFacetFields(facetFieldsArray) {
      var facetsList = [];
      for (var field in facetFieldsArray) {
        var facetsKeyValues = {};
        var facetValuesArray = facetFieldsArray[field];

        for (var i = 0; i < facetValuesArray.length; i += 2) {
          facetsKeyValues[facetValuesArray[i]] = facetValuesArray[i + 1];
        }

        facetsList.push({
          name: field.replace("_str", ""),
          value: facetsKeyValues
        });
      }

      return facetsList;
    }

    // To exclude the Solr's copy field from displaying
    function isFieldVisible(fieldName) {
      return (
        fieldName.indexOf("_") === -1 &&
        fieldName[0] === fieldName[0].toUpperCase()
      );
    }

    // click handler for Facet -> gets called whenever a facet is checked or unchecked
    function toggleFacet(facet, facetfield, facetName) {
      var facetFieldName = "";
      if (facet.gap) {
        var gap = parseInt(facet.gap[1]);
        var unit = facet.gap.slice(2);

        var endDateRange = moment(facetName).add(gap, unit);

        facetFieldName =
          facetfield +
          "$$$[" +
          facetName +
          " TO " +
          endDateRange.toISOString() +
          "]";
      } else {
        facetFieldName = facetfield + '$$$"' + facetName + '"'; // '{!tag=' + facetfield + '}' +
      }

      if (vm.selectedFacetsList.includes(facetFieldName)) {
        vm.selectedFacetsList.splice(
          vm.selectedFacetsList.indexOf(facetFieldName),
          1
        );
      } else {
        vm.selectedFacetsList.push(facetFieldName);
      }

      vm.searchOptions.currentPage = 1;
      search();
    }

    function min(num1, num2) {
      return Math.min(num1, num2);
    }

    function isEmptyObject(obj) {
      return Object.keys(obj).length === 0;
    }

    function resetFilters() {
      vm.collapsedFacets = {};
      vm.selectedFacets = {};
      vm.selectedFacetsList = [];
    }

    vm.$onInit = function() {
      search();
    };
  }
})();
