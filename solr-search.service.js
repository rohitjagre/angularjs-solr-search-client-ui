
(function () {
    'use strict';
    angular
        .module('solrSearchClient')
        .factory('SolrSearchService', solrSearchService);

    solrSearchService.$inject = ['$http', '$rootScope', '$log', "UtilsService"];

    function solrSearchService($http, $rootScope, $log, utilsService) {

        var solrUrl = {solrServerUrl} + "/"+ {solr-collection-name} +"/select";

        function search(query, selectedFacets, searchOptions, facetFields, dateRange, facetRangeFields, statsFields, sort) {
            var params = {
                q: query || "*:*",
                start: (searchOptions.currentPage - 1) * searchOptions.rows || 0,
                rows: searchOptions.rows || 10
            };

            if (sort) {
                params.sort = sort;
            }

            // final query string
            var facetBody = "";

            // Checked facets from the UI
            if (selectedFacets && selectedFacets.length) {

                // Group checked Facets by their type
                var selectedFacetsMap = {};
                selectedFacets.forEach(function (e) {
                    var keyValue = e.split('$$$');
                    var type = keyValue[0];
                    var value = keyValue[1];

                    if (!selectedFacetsMap[type]) {
                        selectedFacetsMap[type] = [value];
                    } else {
                        selectedFacetsMap[type].push(value);
                    }
                });

                var selectedFacetList = [];

                // Add facets to filter query
                // it also tagging the query so that we can use these tags to exclude facet filtering
                for (var key in selectedFacetsMap) {
                    // {!tag=Type}Type:(Associate ForeignLink Recovery)
                    var values = selectedFacetsMap[key].join(' ');
                    var facetStr = 'fq={!tag=' + key + '}' + key + ':(' + values + ')';
                    selectedFacetList.push(facetStr);
                }

                facetBody += selectedFacetList.join('&') + '&';
            }


            // Fields you want facets from
            if (facetFields && facetFields.length) {
                params.facet = "on";
                var fields = [];
                facetFields.forEach(function (e) {
                    fields.push("facet.field=" + e);
                });

                facetBody += fields.join("&");
                facetBody += "&facet.mincount=1" + '&';
            }

            // Date Range Facet
            if (dateRange) {
                var dateRangeQueryString = 'facet.range.start=' + (dateRange.StartDate || dateRange.StartDateValue).toISOString();
                dateRangeQueryString += '&facet.range.end=' + (dateRange.EndDate || dateRange.EndDateValue).toISOString();
                dateRangeQueryString += '&facet.range.gap=' + encodeURIComponent('+') + dateRange.dateRangeGap + '' + dateRange.dateRangeUnit;

                facetBody += dateRangeQueryString + '&';
            }

            // Range Facet fields
            if (facetRangeFields && facetRangeFields.length) {
                var rangeFields = [];
                facetRangeFields.forEach(function (e) {
                    rangeFields.push('facet.range=' + e);
                });
                facetBody += rangeFields.join('&') + '&';
            }

            // Stats Facet Fields
            if (statsFields && statsFields.length) {
                facetBody += 'stats=true';
                var statsFieldsList = [];
                statsFields.forEach(function (e) {
                    statsFieldsList.push('stats.field=' + e);
                });
                facetBody += statsFieldsList.join('&') + '&';
            }

            facetBody = facetBody.slice(0, facetBody.length - 1);

            // You can also group results which can completely change the response format, so be ready to handle that
            //facetBody += '&group=on&group.field=Type_str&group.limit=2';

            var queryString = utilsService.encodeQueryData(params) + "&" + facetBody;

            return $http.get(solrUrl + "?" + queryString).then(function (response) {
                return response.data;
            });
        }

        return {
            search: search
        };
    }
})();
