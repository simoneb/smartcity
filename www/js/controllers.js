angular.module('smartcity.controllers', ['ionic'])
    .controller('homeCtrl', function () {

    })
    .controller('projectCtrl', function ($scope, $stateParams, Projects) {
      $scope.projects = Projects.getById($stateParams.projectId || '_Root');
    })
    .controller('buildTypeCtrl', function ($scope, $stateParams, BuildTypes, Restangular) {
      $scope.buildTypes = BuildTypes.getById($stateParams.buildTypeId);

      $scope.triggerBuild = function (buildType) {
        Restangular.one('buildQueue').customPOST({ buildTypeId: buildType.id });
      };
    })
    .controller('buildCtrl', function ($scope, $stateParams, Builds) {
      $scope.builds = Builds.getById($stateParams.buildId);

      $scope.duration = function (build) {
        var a = moment(build.finishDate, 'yyyyMMddTHHmmssZ');
        var b = moment(build.startDate, 'yyyyMMddTHHmmssZ');

        return a.diff(b, 'seconds');
      };
    })
    .controller('userCtrl', function ($scope, Restangular) {
      $scope.user = Restangular.oneUrl('users', Restangular.configuration.baseUrl + '/users/username:simone.busoli').get().$object;
    })
    .controller('runningBuildsCtrl', function ($scope, $interval, Restangular) {
      Restangular = Restangular.withConfig(function (config) {
        return config.setDefaultHttpFields({cache: false});
      });

      var token = $interval(function () {
        Restangular.all('builds')
            .getList({ count: 1, locator: 'running:true' })
            .then(function (runningBuilds) {
              $scope.runningBuilds = runningBuilds;
            });
      }, 5000);

      $scope.$on('$destroy', function () {
        $interval.cancal(token);
      });
    });
