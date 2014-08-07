angular.module('smartcity.controllers', ['ionic'])
    .controller('loadingCtrl', function ($scope, loadingStatus) {
      $scope.status = loadingStatus;
    })
    .controller('loginCtrl', function ($scope, $ionicPopup, $location, $timeout, Credentials, ConfigureRestangular) {
      $scope.loginData = {
        username: Credentials.getUsername(),
        password: Credentials.getPassword(),
        serverUrl: Credentials.getServerUrl(),
        remember: Credentials.getRemember(),
        useProxy: Credentials.getUseProxy()
      };

      $scope.login = function () {
        Credentials.set(
            $scope.loginData.username,
            $scope.loginData.password,
            $scope.loginData.serverUrl,
            $scope.loginData.remember,
            $scope.loginData.useProxy);

        ConfigureRestangular();

        $timeout(function () {
          $location.url('/');

        }, 500);
      };
    })
    .controller('homeCtrl', function ($scope, $filter, $ionicPopup, $location, Users, Projects, Credentials, Restangular) {
      $scope.user = Users.getCurrentUser().$object;
      $scope.allProjects = Projects.getAll().$object;

      $scope.logout = function () {
        $ionicPopup.confirm({
          title: 'Log out',
          template: 'Are you sure you want to log out?',
          okText: 'Yes',
          cancelText: 'No'
        }).then(function (yes) {
          if (yes) {
            if (!Credentials.getRemember()) {
              Credentials.unset();
            }
            $location.url('/login');
          }
        });
      };
    })
    .controller('projectCtrl', function ($scope, $stateParams, Projects) {
      $scope.allProjects = Projects.getAll().$object;
      $scope.project = Projects.getShallowById($stateParams.projectId).$object;
    })
    .controller('buildTypeCtrl', function ($scope, $stateParams, BuildTypes, Builds, Restangular) {
      $scope.buildType = BuildTypes.getById($stateParams.buildTypeId).$object;
      $scope.builds = BuildTypes.findBuildsByBuildTypeId($stateParams.buildTypeId, { count: 10 }).$object;

      $scope.triggerBuild = function (buildType) {
        Restangular.one('buildQueue').customPOST({ buildTypeId: buildType.id });
      };
    })
    .controller('buildCtrl', function ($scope, $stateParams, Builds) {
      $scope.build = Builds.getById($stateParams.buildId).$object;

      $scope.duration = function () {
        var a = moment($scope.build.finishDate, 'yyyyMMddTHHmmssZ');
        var b = moment($scope.build.startDate, 'yyyyMMddTHHmmssZ');

        return a.diff(b, 'seconds');
      };
    })
    .controller('runningBuildsCtrl', function ($scope, $interval, Restangular) {
      Restangular = Restangular.withConfig(function (config) {
        return config.setDefaultHttpFields({cache: false});
      });

      var token = $interval(function () {
        Restangular.all('builds')
            .withHttpConfig({ skipLoadingIndicator: true })
            .getList({ count: 1, locator: 'running:true' })
            .then(function (runningBuilds) {
              $scope.runningBuilds = runningBuilds;
            });
      }, 20000);

      $scope.$on('$destroy', function () {
        $interval.cancel(token);
      });
    });
