define(function (require) {

  require('css!components/kibi/entity_clipboard/entity_clipboard.css');

  require('modules').get('kibana').directive('kibiEntityClipboard', function ($rootScope, $route, globalState) {

    return {
      restrict: 'E',
      template: require('text!components/kibi/entity_clipboard/entity_clipboard.html'),
      replace: true,
      link: function ($scope, $el) {

        var updateSelectedEntity = function () {
          $scope.disabled = !!globalState.entityDisabled;
          if (globalState.entityURI) {
            $scope.entityURI = globalState.entityURI;
            if (globalState.entityLabel) {
              $scope.label = globalState.entityLabel;
            } else {
              $scope.label = globalState.entityURI;
            }
          }
        };

        $scope.removeEntity = function () {
          delete $scope.entityURI;
          delete $scope.label;
          delete $scope.disabled;
          delete globalState.entityDisabled;
          delete globalState.entityURI;
          delete globalState.entityLabel;
          delete globalState.selectedEntityId;
          globalState.save();
          $route.reload();
        };

        $scope.toggleClipboard = function () {
          $scope.disabled = !$scope.disabled;
          globalState.entityDisabled = !globalState.entityDisabled;
          globalState.save();
          $route.reload();
        };

        var removeHandler = $rootScope.$on('kibi:entityURI:changed', function () {
          updateSelectedEntity();
        });

        $scope.$on('$destroy', function () {
          removeHandler();
        });

        updateSelectedEntity();
      }
    };
  });
});
