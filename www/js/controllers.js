angular.module('smartcity.controllers', ['ionic'])
    .controller('loginCtrl', function ($scope, $ionicPopup, $location, Credentials, ConfigureRestangular) {
      var basic = Credentials.getBasic();

      $scope.loginData = {
        username: basic && atob(basic).split(':')[0],
        password: basic && atob(basic).split(':')[1],
        serverUrl: Credentials.getServerUrl()
      };

      $scope.login = function() {
        Credentials.set($scope.loginData.username, $scope.loginData.password, $scope.loginData.serverUrl);

        ConfigureRestangular();

        $location.url('/');
      };
    })
    .controller('homeCtrl', function ($scope, $ionicPopup, $location, Credentials, Restangular) {

      $scope.user = Restangular.oneUrl('users', Restangular.configuration.baseUrl + '/users/username:simone.busoli').get().$object;


      Restangular.all('projects').getList().then(function(projects){
        $scope.rootProjects = _.filter(projects, { parentProjectId: '_Root' });
      });

      $scope.logout = function () {
        $ionicPopup.confirm({
          title: 'Log out',
          template: 'Are you sure you want to log out?',
          okText: 'Yes',
          cancelText: 'No'
        }).then(function (yes) {
          if (yes) {
            Credentials.unset();
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

        if (isRoot(project)) return Credentials.getServerUrl();

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
        Restangular.all('builds')
            .getList({ count: 1, locator: 'running:true' })
            .then(function (runningBuilds) {
              $scope.runningBuilds = runningBuilds;
            });
      }, 10000);

      $scope.$on('$destroy', function () {
        $interval.cancel(token);
      });
    });
