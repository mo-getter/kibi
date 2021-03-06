define(function (require) {

  require('components/entity_synonym/entity_synonym');

  return function FiltersAggDefinition(Private, Notifier, entitySynonymsProvider) {
    var _ = require('lodash');
    var angular = require('angular');
    var BucketAggType = Private(require('components/agg_types/buckets/_bucket_agg_type'));
    var createFilter = Private(require('components/agg_types/buckets/create_filter/filters'));
    var decorateQuery = Private(require('components/courier/data_source/_decorate_query'));
    var notif = new Notifier({ location: 'Entities Agg' });

    return new BucketAggType({
      name: 'entities',
      dslName: 'filters',
      title: 'Entities',
      createFilter: createFilter,
      params: [
        {
          name: 'filters',
          editor: require('text!components/agg_types/controls/entities.html'),
          default: [ {input: {}} ],
          write: function (aggConfig, output) {
            var inFilters = aggConfig.params.filters;
            if (!_.size(inFilters)) return;

            var outFilters = _.transform(inFilters, function (filters, filter) {
              var input = filter.input;
              if (!input) return notif.log('malformed filter agg params, missing "input" query');

              var synonyms = [];
              input.query.forEach(function (tag, i) {
                var entity = tag.text;
                var newSynonyms = entitySynonymsProvider.getSynonyms(entity);
                synonyms = _(synonyms).concat(newSynonyms);
              });

              input.query = { query_string: { query: synonyms.join(' OR ') } };
              var query = input.query;

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
