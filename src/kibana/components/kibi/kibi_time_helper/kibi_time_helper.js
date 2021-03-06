define(function (require) {
  var datemath = require('utils/datemath');

  return function KibiTimeHelperFactory(Private, Promise, savedDashboards) {
    var _ = require('lodash');
    var kibiStateHelper  = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));

    /*
     * Helper class to obtain correct time filter per dashboard
     */
    function KibiTimeHelper() {
    }

    KibiTimeHelper.prototype.updateTimeFilterForDashboard = function (dashboardId, timeRangeFilter) {
      return new Promise(function (fulfill, reject) {
        savedDashboards.get(dashboardId).then(function (savedDashboard) {
          // check if timeRestore is set to true and only in this case try to modify the timeFilter
          if (savedDashboard.timeRestore === true && savedDashboard.timeFrom && savedDashboard.timeTo) {
            // here take this values from kibiState
            // if there is no value in kibi state then it will already have correct time taken from global time
            var time = kibiStateHelper.getTimeForDashboardId(dashboardId);
            if (time) {
              var from = datemath.parse(time.from).valueOf();
              var to = datemath.parse(time.to).valueOf();
              if (Object.keys(timeRangeFilter.range).length === 1) {
                timeRangeFilter.range[Object.keys(timeRangeFilter.range)[0]].gte = from;
                timeRangeFilter.range[Object.keys(timeRangeFilter.range)[0]].lte = to;
              }
            }
          }
          fulfill(timeRangeFilter);
        }).catch(function (err) {
          reject(err);
        });
      });
    };

    return new KibiTimeHelper();
  };
});
