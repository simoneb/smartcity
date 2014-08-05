angular.module('smartcityApp', ['ionic', 'smartcity.services', 'smartcity.controllers', 'restangular'])
    .constant('ServerUrl', 'http://localhost:3000')
    .config(function ($httpProvider, $urlRouterProvider, $stateProvider, RestangularProvider, ServerUrl) {
      $stateProvider
          .state('home', {
            abstract: true,
            templateUrl: 'templates/home.html',
            controller: 'homeCtrl'
          })
          .state('home.project', {
            url: '/:projectId',
            templateUrl: 'templates/project.html',
            controller: 'projectCtrl'
          })
          .state('home.buildType', {
            url: '/buildType/:buildTypeId',
            templateUrl: 'templates/buildType.html',
            controller: 'buildTypeCtrl'
          })
          .state('home.build', {
            url: '/build/:buildId',
            templateUrl: 'templates/build.html',
            controller: 'buildCtrl'
          });

      $urlRouterProvider.otherwise('/');

      RestangularProvider.setBaseUrl(ServerUrl + '/httpAuth/app/rest');
      RestangularProvider.setDefaultHttpFields({cache: true});

      RestangularProvider.addResponseInterceptor(function (data, operation, what, url, response) {
        if (operation === "getList") {
          return data[what.substring(0, what.length - 1)];
        }

        return data;
      });

      // Workaround for https://github.com/mgonto/restangular/issues/493
      // Part 1: Figure out the protocol, host and port of the base url
      var parser = document.createElement('a');
      parser.href = RestangularProvider.configuration.baseUrl;
      var baseUrl = parser.protocol + '//' + parser.host;

      RestangularProvider.addResponseInterceptor(function (data, operation, what, url, response, deferred) {
        if (operation === "getList") {
          // Workaround for https://github.com/mgonto/restangular/issues/493
          // Part 2: Update selfLinks to have the full URL with the host
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

    })
    .run(function ($ionicPlatform, $state) {
      $ionicPlatform.ready(function () {
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
