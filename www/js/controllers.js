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

        $timeout(function(){
          $location.url('/');

        }, 500);
      };
    })
    .controller('homeCtrl', function ($scope, $ionicPopup, $location, Users, Projects, Credentials, Restangular) {
      $scope.user = Users.getCurrentUser().$object;

      Projects.getShallowRootProjects(function (projecsts) {
        $scope.rootProjects = projecsts;
      });

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
    .controller('projectCtrl', function ($scope, $stateParams, Projects, Credentials) {
      $scope.projects = Projects.getById($stateParams.projectId || '_Root');

      $scope.getFullProjectName = function (project) {
        var isRoot = function (p) {
          return p && !p.parentProjectId;
        };

        if (isRoot(project)) return 'Projects';

        if (isRoot(project.parentProject)) return project.name;

        return project.parentProject.name + ' :: ' + project.name;
      };
    })
    .controller('buildTypeCtrl', function ($scope, $stateParams, BuildTypes, Restangular) {
      $scope.buildTypes = BuildTypes.getById($stateParams.buildTypeId);

      $scope.getFullBuildTypeName = function (buildType) {
        // TODO: this probably does not display correctly when build is on root project
        return buildType.projectName + ' :: ' + buildType.name;
      };

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
    .controller('runningBuildsCtrl', function ($scope, $interval, Restangular) {
      Restangular = Restangular.withConfig(function (config) {
        return config.setDefaultHttpFields({cache: false});
      });

      var token = $interval(function () {
        Restangular.all('builds').withHttpConfig({ skipLoadingIndicator: true })
            .getList({ count: 1, locator: 'running:true' })
            .then(function (runningBuilds) {
              $scope.runningBuilds = runningBuilds;
            });
      }, 20000);

      $scope.$on('$destroy', function () {
        $interval.cancel(token);
      });
    });
