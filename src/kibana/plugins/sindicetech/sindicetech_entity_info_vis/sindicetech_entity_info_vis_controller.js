/*global alert:false */
define(function (require) {
  var module = require('modules').get('kibana/sindicetech_entity_info_vis', ['kibana']);
  var rison = require('utils/rison');
  var _ = require('lodash');
  var $ = require('jquery');
  var kibiUtils = require('kibiutils');

  module.controller(
    'SindicetechEntityInfoVisController',
    function ($rootScope, $scope, $window, $location, globalState, savedSearches, Private, queryEngineClient, Notifier) {

      var notify = new Notifier({
        location: 'Entity Info Widget'
      });

      var urlHelper = Private(require('components/kibi/url_helper/url_helper'));

      // generate random id to avoid collisions if there are multiple widgets on one dashboard
      $scope.snippetContainerId = kibiUtils.getUuid4();

      // we have to wrap the value into object - this prevents weird thing related to transclusion
      // see http://stackoverflow.com/questions/25180613/angularjs-transclusion-creates-new-scope
      $scope.holder = {
        entityURI: '',
        entityURIEnabled: false,
        visible: $('#sindicetech_entity_info_vis_params').is(':visible'),
        html: '',
        htmlEvents:[]
      };


      if (globalState.entityURI) {
        $scope.holder.entityURI = globalState.entityURI;
      } else {
        $scope.holder.entityURI = '';
      }

      var removeEntityURIEnabledHandler = $rootScope.$on('entityURIEnabled', function (event, entityURIEnabled) {
        $scope.holder.entityURIEnabled = entityURIEnabled;
      });

      var removeEntityURIChangedHandler = $rootScope.$on('kibi:entityURI:changed', function (event, entityURI) {
        $scope.holder.entityURI = entityURI;
      });

      $scope.$on('$destroy', function () {
        removeEntityURIEnabledHandler();
        removeEntityURIChangedHandler();
      });

      $scope.$watchMulti(['holder.entityURI', 'vis.params.queryOptions'], function () {
        if (!$scope.vis) return;

        if ($scope.vis.params.queryOptions) {
          $scope.renderTemplates();
        }
      });

      $scope.renderTemplates = function () {
        $scope.holder.html = 'Loading ...';

        queryEngineClient.getQueriesHtmlFromServer(
          $scope.holder.entityURI,
          $scope.vis.params.queryOptions,
          true
        ).then(function (resp) {

          if (resp.data.error) {
            var msg  = '';
            if (typeof resp.data.error === 'string') {
              msg = resp.data.error;
            } else {
              msg = JSON.stringify(resp.data.error, null, '');
            }
            notify.warning(msg);
            return;
          }

          $scope.emptyResults =  resp.data.snippets.length === 0;

          if (resp.data.snippets.length === 0) {

            $scope.holder.html = 'No results';

          } else {

            $scope.holder.html = '';
            _.forEach(resp.data.snippets, function (snippet, index) {

              if (snippet.queryActivated === false) {
                return;
              }

              var label = String(index + 1);

              if (typeof snippet.html === 'undefined') {
                $scope.holder.html +=
                  '<div class="snippetContainer">' +
                  '  <div class="snippet-' + index + '">' +
                  '    <div class="templateResult undefined">' +
                  '      <i class="fa fa-warning"></i> No template set for ' +
                  '        query ' + label + ', please check view options' +
                  '    </div>' +
                  '  </div>' +
                  '</div>';
                return;
              }

              var showFilterButton = false;
              if (snippet.data && snippet.data.ids && snippet.data.ids.length !== 0 &&
                 (snippet.data.config.showFilterButton === true || snippet.data.config.showFilterButton === 1)
              ) {
                showFilterButton = true;
              }
              /* NOTE: disabled experimental feature */
              showFilterButton = false;

              var queryOption = _.find($scope.vis.params.queryOptions, function (option) {
                return option.queryId === snippet.data.config.id;
              });

              var dbFilter;
              if (queryOption.targetField && queryOption.targetField !== '' &&
                 queryOption.queryVariableName && queryOption.queryVariableName !== ''
              ) {

                dbFilter = {
                  meta: {
                    key: 'Relational Filter',
                    value: queryOption.queryId
                  },
                  dbfilter:{
                    queryid: queryOption.queryId,
                    queryVariableName: queryOption.queryVariableName,
                    path: queryOption.targetField
                  }
                };
                // add entity only if present - prevent errors when comparing 2 filters
                // as undefined value is not preserved in url it will get lost
                // and 2 dbfilters migth appear as different one
                if (globalState.entityURI) {
                  dbFilter.dbfilter.entity = globalState.entityURI;
                }
              }

              $scope.holder.html +=
                '<div class="snippetContainer">' +
                  '<div class="snippet-' + index + '">' +
                    '<div class="templateResult">' + snippet.html + '</div>' +
                    '<div class="filterButton" style="display:' + (showFilterButton === true ? 'block' : 'none') + '">' +
                      '<a class="filter" ng-click="holder.htmlEvents[' + index + '].filter()">' +
                        'Filter by "' + snippet.data.config.id + '"' +
                      '</a>' +
                      '<a ng-click="holder.htmlEvents[' + index + '].showQuery()"> <small>(show query)</small></a>' +
                    '</div>' +
                  '</div>' +
                '</div>';

              // here push events for each snippet
              $scope.holder.htmlEvents.push({
                showQuery: function () {
                  alert(snippet.data.debug.sentResultQuery);
                },
                filter: function () {
                  urlHelper.addFilter(dbFilter);
                  urlHelper.switchDashboard(queryOption.redirectToDashboard);
                }
              });
            });
          }

        }).catch(function (error) {
          notify.error(error);
        });

      };

    });
});
