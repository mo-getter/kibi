define(function (require) {
  var shouldEntityUriBeEnabled;

  describe('Kibi Components', function () {
    describe('Require Entity URI', function () {

      require('test_utils/no_digest_promises').activateForSuite();

      beforeEach(function () {
        module('kibana');

        module('queries_editor/services/saved_queries', function ($provide) {
          $provide.service('savedQueries', function (Promise) {
            return {
              get: function (id) {
                var query;

                switch (id) {
                  case 'goaway':
                    query = {
                      st_resultQuery: 'select name from person',
                      st_activationQuery: 'select name from person'
                    };
                    break;
                  case 'sql-result-query':
                    query = {
                      st_resultQuery: 'select name from @TABLE@ where id = @PKVALUE@'
                    };
                    break;
                  case 'sparql-result-query':
                    query = {
                      st_resultQuery: 'select ?name { <@URI@> :name ?name }'
                    };
                    break;
                  case 'sql-activation-query':
                    query = {
                      st_activationQuery: 'select name from @TABLE@ where id = @PKVALUE@'
                    };
                    break;
                  case 'sparql-activation-query':
                    query = {
                      st_resultQuery: 'ask { <@URI@> :name ?name }'
                    };
                    break;
                  case 'rest-params':
                    query = {
                      rest_params: [ { value: '@VAR42@' } ]
                    };
                    break;
                  case 'rest-headers':
                    query = {
                      rest_headers: [ { value: '@VAR42@' } ]
                    };
                    break;
                  default:
                    return Promise.reject('What is this id? ' + id);
                }
                return Promise.resolve(query);
              }
            };
          });
        });

        inject(function (Private) {
          shouldEntityUriBeEnabled = Private(require('plugins/sindicetech/commons/_should_entity_uri_be_enabled'));
        });
      });

      it('should not be required', function (done) {
        shouldEntityUriBeEnabled([ 'goaway', '' ]).then(function (required) {
          expect(required).to.be(false);
          done();
        });
      });

      it('should be required for SQL result query', function (done) {
        shouldEntityUriBeEnabled([ 'sql-result-query' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        });
      });

      it('should be required for SPARQL result query', function (done) {
        shouldEntityUriBeEnabled([ 'sparql-result-query' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        });
      });

      it('should be required for SQL activation query', function (done) {
        shouldEntityUriBeEnabled([ 'sql-activation-query' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        });
      });

      it('should be required for SPARQL activation query', function (done) {
        shouldEntityUriBeEnabled([ 'sparql-activation-query' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        });
      });

      it('should be required for REST params', function (done) {
        shouldEntityUriBeEnabled([ 'rest-params' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        });
      });

      it('should be required for REST headers', function (done) {
        shouldEntityUriBeEnabled([ 'rest-headers' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        });
      });
    });
  });
});
