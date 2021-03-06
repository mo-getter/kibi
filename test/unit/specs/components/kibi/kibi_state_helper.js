define(function (require) {

  var savedDashboards = require('fixtures/saved_dashboards');

  var $rootScope;
  var kibiStateHelper;
  var globalState;
  var $location;
  var $timeout;

  function init(savedDashboardsImpl, locationImpl) {
    return function () {
      module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', savedDashboardsImpl);
      });

      module('kibana');

      inject(function ($injector, Private, _$rootScope_, _globalState_, _$location_, _$timeout_) {
        $rootScope = _$rootScope_;
        globalState = _globalState_;
        $location = _$location_;
        $timeout = _$timeout_;
        kibiStateHelper = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
      });
    };
  }

  describe('Kibi Components', function () {
    describe('KibiStateHelper', function () {

      beforeEach(init(savedDashboards));
      var dashboardId = 'Articles'; // existing one from fixtures/saved_dashboards

      it('save the selected dashboard in a group', function () {
        var groupId = 'group1';

        kibiStateHelper.saveSelectedDashboardId(groupId, dashboardId);
        expect(kibiStateHelper.getSelectedDashboardId(groupId)).to.equal(dashboardId);
      });

      it('save query for dashboard - analyze_wildcard: true', function () {

        var query1 = {
          query_string: {
            query: '*',
            analyze_wildcard: true
          }
        };

        kibiStateHelper.saveQueryForDashboardId(dashboardId, query1);
        expect(kibiStateHelper.getQueryForDashboardId(dashboardId)).to.eql(query1);
      });

      it('save query for dashboard - analyze_wildcard: false', function () {

        var query2 = {
          query_string: {
            query: '*',
            analyze_wildcard: false
          }
        };

        kibiStateHelper.saveQueryForDashboardId(dashboardId, query2);
        expect(kibiStateHelper.getQueryForDashboardId(dashboardId)).to.eql(query2);
      });

      it('save query for dashboard - analyze_wildcard: undefined', function () {

        var query3 = {
          query_string: {
            query: 'A'
          }
        };
        kibiStateHelper.saveQueryForDashboardId(dashboardId, query3);
        expect(kibiStateHelper.getQueryForDashboardId(dashboardId)).to.eql(query3);
      });

      it('save query for dashboard - empty query', function () {

        var query4 = '';

        kibiStateHelper.saveQueryForDashboardId(dashboardId, query4);
        expect(kibiStateHelper.getQueryForDashboardId(dashboardId)).to.eql(undefined);
      });

      it('save filter for dashboard', function () {

        var filters = [{
        }];

        kibiStateHelper.saveFiltersForDashboardId(dashboardId, filters);
        expect(kibiStateHelper.getFiltersForDashboardId(dashboardId)).to.eql(filters);
      });

      it('save filter for dashboard - empty array', function () {

        var filters = [];

        kibiStateHelper.saveFiltersForDashboardId(dashboardId, filters);
        expect(kibiStateHelper.getFiltersForDashboardId(dashboardId)).to.eql(filters);
      });

      it('save filter for dashboard - filter == null', function () {
        var filters = null;
        var expected = [];
        kibiStateHelper.saveFiltersForDashboardId(dashboardId, filters);
        expect(kibiStateHelper.getFiltersForDashboardId(dashboardId)).to.eql(expected);
      });

      it('save filter for dashboard - dashboardId == null', function () {
        var filters = [{}, {}, {}];
        kibiStateHelper.saveFiltersForDashboardId(null, filters);
        expect(kibiStateHelper.getFiltersForDashboardId('null')).to.eql(undefined);
      });

      it('get filter for dashboard - where there are some global filters', function () {
        var expected = [{filter: 1}, {filter: 2}];
        globalState.filters = expected;
        globalState.save();

        expect(kibiStateHelper.getFiltersForDashboardId(dashboardId)).to.eql(expected);
      });

      it('get filter for dashboard - where there are some local filters and global filters', function () {
        var filter1 = {filter: 1};
        var filter2 = {filter: 2};

        globalState.filters = [filter1];
        globalState.save();
        kibiStateHelper.saveFiltersForDashboardId(dashboardId, [filter2]);

        var actual = kibiStateHelper.getFiltersForDashboardId(dashboardId);
        expect(actual).to.contain(filter1);
        expect(actual).to.contain(filter2);
      });


      it('save time filter for dashboard', function () {
        var from = 1;
        var to = 5;

        var expected = {
          from: from,
          to: to
        };

        kibiStateHelper.saveTimeForDashboardId(dashboardId, from, to);
        expect(kibiStateHelper.getTimeForDashboardId(dashboardId)).to.eql(expected);
      });

      it('remove time filter for dashboard', function () {
        var from = 1;
        var to = 5;

        var expected = {
          from: from,
          to: to
        };

        kibiStateHelper.saveTimeForDashboardId(dashboardId, from, to);
        expect(kibiStateHelper.getTimeForDashboardId(dashboardId)).to.eql(expected);
        kibiStateHelper.removeTimeForDashboardId(dashboardId);
        expect(kibiStateHelper.getTimeForDashboardId(dashboardId)).to.eql(null);
      });

      it('is updated when dashboard get saved', function (done) {
        var dashboardWithTimeId = 'time-testing-2';
        var expectedTime = {
          from: 'now-15y',   // taken from 'time-testing-2' saved dashboard
          to: 'now'
        };

        kibiStateHelper.removeTimeForDashboardId(dashboardWithTimeId);
        expect(kibiStateHelper.getTimeForDashboardId(dashboardWithTimeId)).to.eql(null);
        $rootScope.$emit('kibi:dashboard:changed', dashboardWithTimeId);
        // here wait a bit as kibi state will be updated asynchronously
        globalState.on('save_with_changes', function (diff) {
          expect(diff).to.contain('k');
          expect(kibiStateHelper.getTimeForDashboardId(dashboardWithTimeId)).to.eql(expectedTime);
          done();
        });

        $rootScope.$apply();
      });


      it('is time for current dashboard updated when globalState time changed', function (done) {

        var counter = 0;
        globalState.on('save_with_changes', function (diff) {
          if (diff.indexOf('k') !== -1) {
            counter++;
            // get the second 'k' event
            if (counter === 2) {
              expect(kibiStateHelper.getTimeForDashboardId(dashboardWithTimeId)).to.eql(expectedTime);
              done();
            }
          }
        });

        var dashboardWithTimeId = 'time-testing-2';
        var expectedTime = {
          from: 'now-123',
          to: 'now-97'
        };

        $location.path('/dashboard/time-testing-2');
        globalState.time = expectedTime;
        globalState.save();

        $timeout.flush(); // kibiStateHelper uses the $timeout flush the queue of the $timeout service
        $rootScope.$apply();
      });


    });
  });
});


