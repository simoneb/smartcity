angular.module('smartcity.services', [])
    .factory('Projects', function (Restangular) {
      return {
        getShallowRootProjects: function (callback) {
          return Restangular.all('projects').getList().then(function (projects) {
            callback(_.filter(projects, { parentProjectId: '_Root' }));
          });
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
          var buildTypes = [];

          Restangular.one('buildTypes', buildTypeId).get().then(function (buildType) {
            delete buildType.builds;
            buildTypes.push(buildType);

            buildType.getList('builds', { count: 10 }).then(function (builds) {
              async.map(builds || [], function (build, nextBuild) {
                build.get().then(function (build) {
                  nextBuild(null, build);
                });
              }, function (err, builds) {
                buildType.builds = builds;
              });
            });
          });

          return buildTypes;
        }
      }
    })
    .factory('Builds', function (Restangular) {
      return {
        getById: function (buildId) {
          var builds = [];

          Restangular.one('builds', buildId).get().then(function (build) {
            builds.push(build);
          });

          return builds;
        }
      }
    })
    .factory('Credentials', function ($window) {
      return {
        exist: function () {
          return !!$window.localStorage.credentials && !!$window.localStorage.serverUrl;
        },
        getBasic: function () {
          return $window.localStorage.credentials;
        },
        getBaseUrl: function () {
          var serverUrl = $window.localStorage.serverUrl;
          var baseUrl = serverUrl + (/\/$/.test(serverUrl) ? '' : '/') + 'httpAuth/app/rest';

          return baseUrl;
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
        set: function (username, password, serverUrl, remember) {
          $window.localStorage.credentials = btoa(username + ':' + password);
          $window.localStorage.serverUrl = serverUrl;
          $window.localStorage.rememberCredentials = remember;
        },
        unset: function () {
          delete $window.localStorage.credentials;
          delete $window.localStorage.serverUrl;
          delete $window.localStorage.rememberCredentials;
        }
      };
    })
    .factory('ConfigureRestangular', function (Restangular, Credentials) {
      return function () {
        if (Credentials.exist()) {
          Restangular.setBaseUrl(Credentials.getBaseUrl());
          Restangular.setDefaultHeaders({ authorization: 'Basic ' + Credentials.getBasic()});
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
    })
    .service('loadingStatus', function ($timeout) {
      var token,
          self = this;

      this.loading = false;
      this.set = function (value) {
        if(angular.isDefined(token)) {
          $timeout.cancel(token);
        }

        // delay hiding loading indicator
        token = $timeout(function(){
          self.loading = !!value;
        }, value ? 0 : 200);
      };
    })
    .factory('loadingInterceptor', function ($q, $timeout, loadingStatus) {
      return {
        request: function (config) {
          if (!config.skipLoadingIndicator) {
            loadingStatus.set(true);
          }
          return config;
        },
        response: function (response) {
          loadingStatus.set(false);
          return response;
        },
        responseError: function (rejection) {
          loadingStatus.set(false);
          return $q.reject(rejection);
        }
      }
    });