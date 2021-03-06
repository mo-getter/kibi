define(function (require) {
  var joinFilterHelper;
  var kibiStateHelper;
  var config;

  describe('Kibi Components', function () {
    describe('Join Filter Helper', function () {

      require('test_utils/no_digest_promises').activateForSuite();

      beforeEach(function () {
        module('kibana');

        module('kibana', function ($provide) {
          $provide.service('config', function () {
            var keys = {};
            return {
              get: function (key) { return keys[key]; },
              set: function (key, value) { keys[key] = value; }
            };
          });
          $provide.constant('configFile', {
            elasticsearch_plugins: [ 'FilterJoinPlugin' ]
          });
        });

        module('app/dashboard', function ($provide) {
          $provide.service('savedDashboards', function (Promise) {
            return {
              find: function () {
                return Promise.resolve({
                  hits: [
                    {
                      id: 'Corn Dogs',
                      savedSearchId: 'Corn'
                    },
                    {
                      id: 'Corn Flakes',
                      savedSearchId: 'Flakes'
                    },
                    {
                      id: 'Potatoes',
                      savedSearchId: 'potato'
                    }
                  ]
                });
              },
              get: function (id) {
                switch (id) {
                  case 'nossid':
                    return Promise.resolve({ id: 'cry' });
                  case 'Corn Dogs':
                    return Promise.resolve({ id: 'cry', savedSearchId: 'Corn' });
                  case 'Boiled Dogs':
                    return Promise.resolve({ savedSearchId: 'Boiled' });
                  default:
                    return Promise.reject(new Error('try again'));
                }
              }
            };
          });
        });

        module('discover/saved_searches', function ($provide) {
          $provide.service('savedSearches', function (Promise) {
            return {
              get: function (id) {
                switch (id) {
                  case 'potato':
                    return Promise.resolve({ searchSource: { _state: { index: { id: 'her' } } } });
                  case 'Flakes':
                    return Promise.resolve({ searchSource: { _state: { index: { id: 'you' } } } });
                  case 'Corn':
                    return Promise.resolve({ searchSource: { _state: { index: { id: 'me' } } } });
                  case 'Boiled':
                    return Promise.resolve({ searchSource: { _state: { index: {} } } });
                  default:
                    return Promise.reject(new Error('try again'));
                }
              }
            };
          });
        });

        inject(function (Private, _config_) {
          config = _config_;
          joinFilterHelper = Private(require('components/sindicetech/join_filter_helper/join_filter_helper'));
          kibiStateHelper = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
        });
      });

      describe('getJoinFilter', function () {
        it('should be disabled/enabled according to relationalPanelConfig', function () {
          expect(joinFilterHelper.isFilterJoinPluginEnabled()).to.not.be.ok();
          config.set('kibi:relationalPanelConfig', { enabled: true });
          expect(joinFilterHelper.isFilterJoinPluginEnabled()).to.be.ok();
          config.set('kibi:relationalPanelConfig', { enabled: false });
          expect(joinFilterHelper.isFilterJoinPluginEnabled()).to.not.be.ok();
        });

        it('should be enabled if the plugin is installed', function () {
          expect(joinFilterHelper.isFilterJoinPluginInstalled()).to.be.ok();
        });

        it('should fail if focus dashboard is not passed', function (done) {
          joinFilterHelper.getJoinFilter().catch(function (err) {
            expect(err.message).to.be('Specify focusDashboardId');
            done();
          });
        });

        it('should fail if the focused dashboard cannot be retrieved', function (done) {
          joinFilterHelper.getJoinFilter('pluto').catch(function (err) {
            expect(err.message).to.be('try again');
            done();
          });
        });

        it('should fail if the focused dashboard does not have a saved search', function (done) {
          joinFilterHelper.getJoinFilter('nossid').catch(function (err) {
            expect(err.message).to.be('The focus dashboard "nossid" does not have a saveSearchId');
            done();
          });
        });

        it('should fail if the saved search of the focused dashboard does not have an index id', function (done) {
          joinFilterHelper.getJoinFilter('Boiled Dogs').catch(function (err) {
            expect(err.message).to.be('The join filter has no enabled relation for the focused index: undefined');
            done();
          });
        });

        it('should fail if the join filter has no enabled relation', function (done) {
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            enabledRelations: [ [ 'tea', '42' ] ]
          });
          joinFilterHelper.getJoinFilter('Corn Dogs').catch(function (err) {
            expect(err.message).to.be('The join filter has no enabled relation for the focused index: me');
            done();
          });
        });

        it('should build the join filter', function (done) {
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            enabledRelations: [ [ 'me.id', 'you.id' ] ]
          });
          joinFilterHelper.getJoinFilter('Corn Dogs').then(function (joinFilter) {
            expect(joinFilter.join).to.be.ok();
            expect(joinFilter.join.focus).to.be('me');
            expect(joinFilter.join.filters.me).to.not.be.ok();
            done();
          });
        });

        it('should build the join filter with filters on dashboards', function (done) {
          // filters from the focused dashboard are not put in the filters of the join query
          kibiStateHelper.saveFiltersForDashboardId('Corn Dogs', [ { range: { gte: 20, lte: 40 } } ]);
          kibiStateHelper.saveFiltersForDashboardId('Corn Flakes', [ { term: { aaa: 'bbb' } } ]);
          // filters from the Potatoes dashboard are not taken since its index is not connected to the focus
          kibiStateHelper.saveFiltersForDashboardId('Potatoes', [ { exists: { field: 'aaa' } } ]);
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            enabledRelations: [ [ 'me.id', 'you.id' ] ]
          });
          joinFilterHelper.getJoinFilter('Corn Dogs').then(function (joinFilter) {
            expect(joinFilter.join).to.be.ok();
            expect(joinFilter.join.focus).to.be('me');
            expect(joinFilter.join.filters.me).to.not.be.ok();
            expect(joinFilter.join.filters.her).to.not.be.ok();
            expect(joinFilter.join.filters.you).to.be.ok();
            expect(joinFilter.join.filters.you[0].term).to.be.ok();
            done();
          });
        });

        it('should build the join filter with queries on dashboards', function (done) {
          // queries from the focused dashboard are not put in the filters of the join query
          kibiStateHelper.saveQueryForDashboardId('Corn Dogs', { query_string: { query: 'aaa' } });
          kibiStateHelper.saveQueryForDashboardId('Corn Flakes', { query_string: { query: 'bbb' } });
          // queries from the Potatoes dashboard are not taken since its index is not connected to the focus
          kibiStateHelper.saveQueryForDashboardId('Potatoes', { query_string: { query: 'ccc' } });
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            enabledRelations: [ [ 'me.id', 'you.id' ] ]
          });
          joinFilterHelper.getJoinFilter('Corn Dogs').then(function (joinFilter) {
            expect(joinFilter.join).to.be.ok();
            expect(joinFilter.join.focus).to.be('me');
            expect(joinFilter.join.filters.me).to.not.be.ok();
            expect(joinFilter.join.filters.her).to.not.be.ok();
            expect(joinFilter.join.filters.you).to.be.ok();
            expect(joinFilter.join.filters.you[0].query).to.be.ok();
            done();
          }).catch(done);
        });
      });

      describe('updateJoinFilter', function () {
        var urlHelper;
        var sinon = require('test_utils/auto_release_sinon');

        beforeEach(function () {
          inject(function (Private) {
            urlHelper   = Private(require('components/kibi/url_helper/url_helper'));
          });
          sinon.spy(urlHelper, 'removeJoinFilter');
          sinon.spy(urlHelper, 'addFilter');
        });

        it('should remove the join filter 1', function (done) {
          joinFilterHelper.updateJoinFilter().then(function () {
            expect(urlHelper.removeJoinFilter.called).to.be.ok();
            done();
          });
        });

        it('should remove the join filter 2', function (done) {
          sinon.stub(urlHelper, 'getCurrentDashboardId').returns('aaa');
          joinFilterHelper.updateJoinFilter().then(function () {
            expect(urlHelper.removeJoinFilter.called).to.be.ok();
            done();
          });
        });

        it('should add the join filter', function (done) {
          kibiStateHelper.saveFiltersForDashboardId('Corn Dogs', [ { range: { gte: 20, lte: 40 } } ]);
          kibiStateHelper.saveFiltersForDashboardId('Corn Flakes', [ { term: { aaa: 'bbb' } } ]);
          kibiStateHelper.saveFiltersForDashboardId('Potatoes', [ { exists: { field: 'aaa' } } ]);
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            enabledRelations: [ [ 'me.id', 'you.id' ] ]
          });
          sinon.stub(urlHelper, 'getCurrentDashboardId').returns('Corn Dogs');
          joinFilterHelper.updateJoinFilter().then(function () {
            expect(urlHelper.addFilter.called).to.be.ok();
            done();
          });
        });
      });
    });
  });
});
