angular.module('smartcity.controllers', ['ionic'])
    .controller('loadingCtrl', function ($scope, loadingStatus) {
      $scope.status = loadingStatus;
    })
    .controller('loginCtrl', function ($scope, $ionicPopup, $location, $timeout, Credentials, ConfigureRestangular) {
      $scope.isWebView = ionic.Platform.isWebView();

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
    .controller('homeCtrl', function ($scope, $filter, $ionicPopup, $location, Users, Projects, Credentials) {
      $scope.user = Users.getCurrentUser().$object;
      $scope.allProjects = Projects.getAll().$object;

      $scope.exit = function () {
        $ionicPopup.confirm({
          title: 'Exit',
          template: 'Are you sure you want to log exit?',
          okText: 'Yes',
          cancelText: 'No'
        }).then(function (yes) {
          if (yes) {
            if (!Credentials.getRemember()) {
              Credentials.unset();
            }

            Credentials.loggedOut(true);

            if (ionic.Platform.isWebView()) {
              ionic.Platform.exitApp();
            } else {
              $location.url('/login');
            }
          }
        });
      };
    })
    .controller('projectCtrl', function ($scope, project, allProjects) {
      $scope.project = project;
      $scope.allProjects = allProjects;
    })
    .controller('buildTypeCtrl', function ($scope, buildType, BuildTypes, BuildQueue) {
      $scope.buildType = buildType;
      $scope.builds = BuildTypes.findBuildsByBuildTypeId(buildType.id, { count: 10, locator: 'running:any' }).$object;

      $scope.triggerBuild = function () {
        BuildQueue.enqueue({ buildTypeId: buildType.id });
      };
    })
    .controller('buildCtrl', function ($scope, $interval, build, getBuild, BuildQueue) {
      var refreshToken;

      $scope.build = build;

      $scope.triggerBuild = function () {
        BuildQueue.enqueue({ buildTypeId: $scope.build.buildTypeId });
      };

      if (build.running) {
        refreshToken = $interval(function () {
          getBuild().then(function (build) {
            $scope.build = build;

            if (!build.running) {
              $interval.cancel(refreshToken);
            }
          })
        }, 5000);
      }

      $scope.$on('$destroy', function () {
        if (refreshToken)
          $interval.cancel(refreshToken);
      });
    })
    .controller('runningBuildsCtrl', function ($scope, $interval, $timeout, Restangular) {
      Restangular = Restangular.withConfig(function (config) {
        return config.setDefaultHttpFields({cache: false});
      });

      var getRunningBuilds = function () {
        Restangular.one('builds')
            .withHttpConfig({ skipLoadingIndicator: true })
            .get({ fields: 'count', locator: 'running:true' })
            .then(function (runningBuilds) {
              $scope.runningBuildsCount = runningBuilds.count;
            });
      };

      var token = $interval(getRunningBuilds, 5000);

      $timeout(getRunningBuilds);

      $scope.$on('$destroy', function () {
        $interval.cancel(token);
      });
    });
