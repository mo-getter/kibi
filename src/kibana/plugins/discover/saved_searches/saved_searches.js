define(function (require) {
  var _ = require('lodash');

  require('plugins/discover/saved_searches/_saved_search');
  require('components/notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify'
  ]);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/settings/saved_object_registry').register({
    service: 'savedSearches',
    title: 'searches'
  });

  module.service('savedSearches', function (Private, Promise, config, configFile, es, createNotifier, SavedSearch, kbnUrl) {

    var cache = Private(require('components/sindicetech/cache_helper/cache_helper'));
    var notify = createNotifier({
      location: 'Saved Searches'
    });

    this.type = SavedSearch.type;
    this.Class = SavedSearch;

    this.get = function (id) {
      var cacheKey = 'savedSearches-id-' + id;
      if (cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      var promise = (new SavedSearch(id)).init();
      if (cache) {
        cache.set(cacheKey, promise);
      }
      return promise;
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/discover/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedSearch(id)).delete();
      });
    };

    this.find = function (searchString) {
      var self = this;
      var body;
      if (searchString) {
        body = {
          query: {
            simple_query_string: {
              query: searchString + '*',
              fields: ['title^3', 'description'],
              default_operator: 'AND'
            }
          }
        };
      } else {
        body = { query: {match_all: {}}};
      }

      // cache the results of this method
      var cacheKey = 'savedSearches' + ( searchString ? searchString : '' );
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return es.search({
        index: configFile.kibana_index,
        type: 'search',
        body: body,
        size: 100
      })
      .then(function (resp) {
        var ret = {
          total: resp.hits.total,
          hits: resp.hits.hits.map(function (hit) {
            var source = hit._source;
            source.id = hit._id;
            source.url = self.urlFor(hit._id);
            return source;
          })
        };

        if (cache) {
          cache.set(cacheKey, ret);
        }

        return ret;
      });
    };
  });
});
