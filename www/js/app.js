angular.module('smartcityApp', ['ionic', 'smartcity.services', 'smartcity.controllers', 'smartcity.filters', 'restangular'])
    .value('ProxyUrl', 'http://teamcityproxy.herokuapp.com')
    .constant('$ionicLoadingConfig', {
      template: 'Loading...'
    })
    .config(function ($stateProvider, $urlRouterProvider, $httpProvider) {
      $stateProvider
          .state('landing', {
            url: '/landing',
            onEnter: function ($location, Credentials) {
              if (!Credentials.exist() || Credentials.loggedOut()) {
                $location.url('/login');
              } else {
                $location.url('/')
              }
            }
          })
          .state('login', {
            url: '/login',
            templateUrl: 'templates/login.html',
            controller: 'loginCtrl'
          })
          .state('home', {
            abstract: true,
            templateUrl: 'templates/home.html',
            controller: 'homeCtrl'
          })
          .state('home.project', {
            url: '/:projectId',
            templateUrl: 'templates/project.html',
            controller: 'projectCtrl',
            resolve: {
              project: function ($stateParams, Projects) {
                return Projects.getShallowById($stateParams.projectId);
              },
              allProjects: function ($stateParams, Projects) {
                return Projects.getAll();
              }
            }
          })
          .state('home.buildType', {
            url: '/buildType/:buildTypeId',
            templateUrl: 'templates/buildType.html',
            controller: 'buildTypeCtrl',
            resolve: {
              buildType: function ($stateParams, BuildTypes) {
                return BuildTypes.getById($stateParams.buildTypeId);
              },
              builds: function($stateParams, BuildTypes) {
                return BuildTypes.findBuildsByBuildTypeId($stateParams.buildTypeId, { count: 10, locator: 'running:any' });
              }
            }
          })
          .state('home.build', {
            url: '/build/:buildId',
            templateUrl: 'templates/build.html',
            controller: 'buildCtrl',
            resolve: {
              build: function (getBuild) {
                return getBuild();
              },
              getBuild: function ($stateParams, Builds) {
                return function () {
                  return Builds.getById($stateParams.buildId);
                };
              }
            }
          });

      $urlRouterProvider.otherwise('/landing');
    })
    .run(function ($rootScope, $ionicPopup, $ionicLoading, $location, Credentials, Restangular, ConfigureRestangular) {
      var requestErrorShown = false,
          authenticationErrorShown = false,
          notFoundErrorShown = false;

      ConfigureRestangular();

      $rootScope.$on('$stateChangeStart', function (event, to) {
        if (to.resolve) {
          $ionicLoading.show();
        }
      });

      $rootScope.$on('$stateChangeSuccess', function () {
        $ionicLoading.hide();
      });

      $rootScope.$on('$stateChangeError', function () {
        $ionicLoading.hide();
      });

      Restangular.addResponseInterceptor(function (data, operation, what, url, response) {
        if (operation === "getList") {
          return data[what.substring(0, what.length - 1)];
        }

        return data;
      });

      Restangular.setErrorInterceptor(function (response, deferred, responseHandler) {
        switch (response.status) {
          case 401:
            if (authenticationErrorShown) return false;
            authenticationErrorShown = true;

            $ionicPopup.alert({
              title: '<h4><i class="icon ion-alert-circled icon-left energized"></i>  Login problem</h4>',
              template: "The credentials you supplied are invalid, please try again.",
              okType: 'button-dark'
            }).then(function () {
              authenticationErrorShown = false;
              $location.url('/login');
            });
            return false;
          case 404:
            if (notFoundErrorShown) return false;
            notFoundErrorShown = true;

            $ionicPopup.alert({
              title: '<h4><i class="icon ion-alert-circled icon-left energized"></i>  Cannot contact server</h4>',
              template: "The server cannot be contacted, please try logging in again.",
              okType: 'button-dark'
            }).then(function () {
              notFoundErrorShown = false;
              $location.url('/login');
            });
            return false;
          case 0: // request error
            if (requestErrorShown) return false;
            requestErrorShown = true;

            $ionicPopup.alert({
              title: '<h4><i class="icon ion-alert-circled assertive"></i>  Connection error</h4>',
              template: "There's been an error contacting the TeamCity server, " +
                  "make sure that the server url is correct and that your internet connection is working.",
              okType: 'button-dark'
            }).then(function () {
              requestErrorShown = false;
              $location.url('/login');
            });
            return false;
        }

        return true; // error not handled
      });

      var parser = document.createElement('a');

      Restangular.addResponseInterceptor(function (data, operation, what, url, response, deferred) {
        var baseUrl = Credentials.getBaseUrl();
        parser.href = baseUrl;
        baseUrl = parser.protocol + '//' + parser.host;

        if (operation === "getList") {
          if (data && data.length && data[0].href) {
            data.forEach(function (item) {
              if (item.href && item.href[0] === '/') {
                item.href = baseUrl + item.href;
              }
            });
          }
        }
        if (operation === 'get') {
          data.href = baseUrl + data.href;
        }

        return data;
      });

      ionic.Platform.ready(function () {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
          cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
          StatusBar.styleDefault();
        }
      });
    });
