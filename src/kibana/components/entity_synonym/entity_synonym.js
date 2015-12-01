define(function (require) {
  var module = require('modules').get('kibana/entity_synonyms');
  module.service('entitySynonymsProvider', function (Private, configFile, queryEngineClient) {
    var _ = require('lodash');
    this.entitiesQueryId = configFile.query_expansion.entities_query_id;
    this.synonymsQueryId = configFile.query_expansion.synonyms_query_id;

    this.getSuggestions = function (prefix) {
      console.log('getSuggestions(' + prefix + ')');
      return ['entity1', 'entity2', 'entity3'];
      //var matches = // code to search this._suggestions array by prefix here (using lodash, see _.findWhere or similar)
      //return matches;
    };

    this.getSynonyms = function (entity) {
      console.log('getSynonyms(' + entity + ')');
      return ['synonym1', 'synonym2', 'synonym3'];
      //return queryEngineClient.getQueriesDataFromServer(...);
    };

    var getAllEntities = function (entitiesQueryId) {
      console.log('getAllEntities(' + entitiesQueryId + ')');
      //return queryEngineClient.getQueriesDataFromServer(...);
    };

    this.entities = getAllEntities(this.entitiesQueryId);
  });
});
