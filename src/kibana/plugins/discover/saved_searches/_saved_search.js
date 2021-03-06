define(function (require) {
  var _ = require('lodash');

  require('components/notify/notify');

  var module = require('modules').get('discover/saved_searches', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedSearch', function (courier) {
    _(SavedSearch).inherits(courier.SavedObject);
    function SavedSearch(id) {
      courier.SavedObject.call(this, {
        type: SavedSearch.type,
        mapping: SavedSearch.mapping,
        searchSource: SavedSearch.searchSource,

        id: id,
        defaults: {
          title: 'New Saved Search',
          description: '',
          columns: [],
          hits: 0,
          sort: [],
          version: 1
        }
      });
    }

    SavedSearch.type = 'search';

    SavedSearch.mapping = {
      title: 'string',
      description: 'string',
      hits: 'long',
      columns: 'string',
      sort: 'string',
      version: 'long'
    };

    SavedSearch.searchSource = true;

    return SavedSearch;
  });
});
