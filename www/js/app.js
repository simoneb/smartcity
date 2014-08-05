angular.module('smartcityApp', ['ionic', 'smartcity.services', 'smartcity.controllers', 'restangular'])
    .config(function ($stateProvider, $urlRouterProvider) {
      $stateProvider
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
    })
    .run(function ($ionicPlatform, $location, Credentials, Restangular, ConfigureRestangular) {
      $ionicPlatform.ready(function () {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
          cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
          StatusBar.styleDefault();
        }

//        Restangular.setDefaultHttpFields({cache: true});

        Restangular.addResponseInterceptor(function (data, operation, what, url, response) {
          if (operation === "getList") {
            return data[what.substring(0, what.length - 1)];
          }

          return data;
        });

        Restangular.setErrorInterceptor(function (response, deferred, responseHandler) {
          switch (response.status) {
            case 401:
              $location.url('/login');
              return false;
            case 0: // request error
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

        if (!Credentials.exist()) {
          return $location.url('/login');
        }

        ConfigureRestangular();
      });
    });
