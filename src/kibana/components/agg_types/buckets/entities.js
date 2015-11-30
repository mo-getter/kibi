define(function (require) {
  return function FiltersAggDefinition(Private, Notifier, $http) {
    var _ = require('lodash');
    var angular = require('angular');
    var BucketAggType = Private(require('components/agg_types/buckets/_bucket_agg_type'));
    // var suggestionsProvider = require('components/suggestions_provider/suggestions_provider');
    var createFilter = Private(require('components/agg_types/buckets/create_filter/entities'));
    var decorateQuery = Private(require('components/courier/data_source/_decorate_query'));
    var notif = new Notifier({ location: 'Entities Agg' });




    return new BucketAggType({
      name: 'entities',
      title: 'Entities',
      dslName: 'filters',
      createFilter: createFilter,
      params: [
        {
          name: 'entities',
          editor: require('text!components/agg_types/controls/entities.html'),
          default: [ {input: {}} ],
          write: function (aggConfig, output) {





sparql_resp ='';
url = 'datasource/getQueriesData';
//url="";
uri = "";
//uri = $scope.holder.entityURI;
queryDefs=[
              {
                open: true,
                queryId: "entity-sparql-query",
                showFilterButton: false,
                templateId: "kibi-table-handlebars",
                templateVars: {
                 
                }
              }
            ];
async=true;


      if (queryDefs && !(queryDefs instanceof Array) && (typeof queryDefs === 'object') && queryDefs !== null) {
        queryDefs = [queryDefs];
      }
      var params = {
        entityURI: '',
        queryDefs: JSON.stringify(queryDefs)
      };

      if (async === false) {
        // here we use jquery to make a sync call as it is not supported in $http
        var p =  $.ajax({
          url: url,
          async: false,
          dataType: 'json',
          data: params,
          dataFilter: function (data, type) {

            if (type === 'json') {
              var json = JSON.parse(data);
              // wrap it so the response is in the same form as returned from $http
              return JSON.stringify({
                data: json
              });
            } else {
              return data;
            }
          }
        });
        // here make an alias so we can use catch as with Promises
        p.catch = p.fail;
        return p;
      } else {
console.log('AT ANY COST');
$http({
          method: 'GET',
          url: url,
          params: params
        }).then(function (resp) {
console.log('EXPECT NOW');
sparql_resp = resp.data.snippets[0].results.bindings;
console.log(resp.data.snippets[0].results.bindings[0].label.value);
});
        //return $http({
          //method: 'GET',
//          url: url,
//          params: params
//        });
      }



            var inFilters = aggConfig.params.entities;

var sparql_first_two_elements = sparql_resp.slice(0, 2);

inFilters.forEach(function(entry, i){
console.log(inFilters);
console.log(i);

     inFilters[i].input.query.query_string.query = sparql_first_two_elements[i].label.value;
});
console.log(inFilters);
//inFilters[0].input.query.query_string.query = resp.data.snippets[0].results.bindings[0].label.value;

            if (!_.size(inFilters)) return;

            var outFilters = _.transform(inFilters, function (entities, entity) {
              var input = entity.input;
              if (!input) return notif.log('malformed filter agg params, missing "input" query');

              var query = input.query;
              if (!query) return notif.log('malformed filter agg params, missing "query" on input');

              decorateQuery(query);

              var label = _.deepGet(query, 'query_string.query') || angular.toJson(query);
              filters[label] = input;
            }, {});

            if (!_.size(outFilters)) return;

            var params = output.params || (output.params = {});
            params.filters = outFilters;
          }
        }
      ]
    });
  };
});
