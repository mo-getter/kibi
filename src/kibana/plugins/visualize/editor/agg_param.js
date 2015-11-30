define(function (require) {
  var _ = require('lodash');
  require('ng-tags-input');
  require('modules')
  .get('app/visualize')
  .directive('visAggParamEditor', function (config, $parse, Private, $http) {
    return {
      restrict: 'E',
      scope: true,
      template: function ($el) {
        return $el.html();
      },
      link: {
        pre: function ($scope, $el, attr) {
          $scope.$bind('aggParam', attr.aggParam);
          if ($scope.aggParam.name == 'filters') {
            _.forEach($scope.aggParam.filters, function(filter, i) {
              console.log(filter + ', ' + i);
              $scope['tags' + i] = [];
            });
          }
        },
        post: function ($scope, $el, attr) {
          $scope.config = config;

          $scope.optionEnabled = function (option) {
            if (option && _.isFunction(option.enabled)) {
              return option.enabled($scope.agg);
            }

            return true;
          };

          if ($scope.aggParam.name == 'filters') {
            $scope.$watch('tags', function(newValue, oldValue) {
              _.map()
            });
          }
        }
      }
    };
  });
});
