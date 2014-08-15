angular.module('smartcity.services', ['ionic'])
    .factory('Projects', function (Restangular) {
      var projects = [];

      return {
        getShallowById: function (projectId) {
          return Restangular.one('projects', projectId || '_Root').get();
        },
        getAll: function () {
          return Restangular.all('projects').getList();
        },
        getById: function (projectId) {
          var projects = [];

          function setChildren(project, callback) {
            async.parallel({
              buildTypes: function (callback) {
                project.getList('buildTypes').then(function (buildTypes) {
                  async.map(buildTypes, function (buildType, nextBuildType) {
                    buildType.getList('builds', { count: 1 }).then(function (builds) {
                      buildType.builds = builds;
                      nextBuildType(null, buildType);
                    });
                  }, callback);
                });
              },
              childProjects: function (callback) {
                async.map(project.projects.project || [], function (child, nextChildProject) {
                  Restangular.one('projects', child.id).get().then(function (child) {
                    nextChildProject(null, child);
                  });
                }, callback);
              }
            }, function (err, results) {
              project.buildTypes = results.buildTypes;
              project.projects = results.childProjects;

              async.each(project.projects, setChildren, callback);
            });
          }

          Restangular.one('projects', projectId).get().then(function (project) {
            projects.push(project);
            setChildren(project, angular.noop);
          });

          return projects;
        }
      };
    })
    .factory('BuildTypes', function (Restangular) {
      return {
        getById: function (buildTypeId) {
          var buildType = Restangular.one('buildTypes', buildTypeId).get();

          /*buildType.then(function (buildType) {
           delete buildType.builds;
           buildType.getList('builds', { count: 10 }).then(function (builds) {
           async.map(builds || [], function (build, nextBuild) {
           build.get().then(function (build) {
           nextBuild(null, build);
           });
           }, function (err, builds) {
           buildType.builds = builds;
           });
           });
           return buildType;
           });*/

          return buildType;
        },
        findBuildsByBuildTypeId: function (buildTypeId, params) {
          return Restangular
              .one('buildTypes', buildTypeId)
              .all('builds')
              .getList(params);
        }
      }
    })
    .factory('Builds', function (Restangular) {
      return {
        getById: function (buildId) {
          return Restangular.one('builds', buildId).get();
        },
        findByBuildTypeId: function (buildTypeId, params) {

        }
      }
    })
    .factory('BuildQueue', function (Restangular) {
      return {
        enqueue: function (descriptor) {
          return Restangular.one('buildQueue').customPOST(descriptor);
        }
      };
    })
    .factory('Credentials', function ($window, ProxyUrl) {
      function buildBaseUrl(serverUrl) {
        return serverUrl + (/\/$/.test(serverUrl) ? '' : '/') + 'httpAuth/app/rest';
      }

      return {
        exist: function () {
          return !!$window.localStorage.credentials && !!$window.localStorage.serverUrl;
        },
        getBasic: function () {
          return $window.localStorage.credentials;
        },

        getBaseUrl: function () {
          return buildBaseUrl(this.getUseProxy() ? ProxyUrl : $window.localStorage.serverUrl);
        },
        getServerUrl: function () {
          return $window.localStorage.serverUrl;
        },
        getUsername: function () {
          return $window.localStorage.credentials && atob($window.localStorage.credentials).split(':')[0];
        },
        getPassword: function () {
          return $window.localStorage.credentials && atob($window.localStorage.credentials).split(':')[1];
        },
        getRemember: function () {
          return !!($window.localStorage.rememberCredentials &&
              JSON.parse($window.localStorage.rememberCredentials));
        },
        getUseProxy: function () {
          return !!($window.localStorage.useProxy &&
              JSON.parse($window.localStorage.useProxy));
        },
        loggedOut: function (loggedOut) {
          if (angular.isDefined(loggedOut)) {
            return $window.localStorage.loggedOut = loggedOut;
          }

          return !!($window.localStorage.loggedOut &&
              JSON.parse($window.localStorage.loggedOut))
        },
        set: function (username, password, serverUrl, remember, useProxy) {
          $window.localStorage.credentials = btoa(username + ':' + password);
          $window.localStorage.serverUrl = serverUrl;
          $window.localStorage.rememberCredentials = remember;
          $window.localStorage.useProxy = useProxy;
          this.loggedOut(false);
        },
        unset: function () {
          delete $window.localStorage.credentials;
          delete $window.localStorage.serverUrl;
          delete $window.localStorage.rememberCredentials;
          delete $window.localStorage.useProxy;
        }
      };
    })
    .factory('ConfigureRestangular', function (Restangular, Credentials, ProxyUrl) {
      return function () {
        if (Credentials.exist()) {
          var headers = { authorization: 'Basic ' + Credentials.getBasic()};

          Restangular.setBaseUrl(Credentials.getBaseUrl());

          if (Credentials.getUseProxy()) {
            _.merge(headers, { 'x-teamcity': Credentials.getServerUrl() });
          }

          Restangular.setDefaultHeaders(headers);
        }
      }
    })
    .factory('Users', function (Restangular, Credentials) {
      return {
        getCurrentUser: function () {
          return Restangular.oneUrl('users',
                  Credentials.getBaseUrl() + '/users/username:' + Credentials.getUsername())
              .get();
        }
      }
    });