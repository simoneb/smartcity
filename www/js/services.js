angular.module('smartcity.services', [])
    .filter('rootProjects', function () {
      return function (projects) {
        if (!angular.isArray(projects)) {
          return projects;
        }

        return _.filter(projects, { parentProjectId: '_Root' });
      };
    })
    .filter('buildTypeName', function () {
      return function (buildType) {
        if (!_.has(buildType, 'projectName') || !_.has(buildType, 'name')) {
          return '';
        }
        // TODO: this probably does not display correctly when build is on root project
        return buildType.projectName + ' :: ' + buildType.name;
      };
    })
    .filter('buildName', function () {
      return function (build) {
        if (!_.has(build, 'buildType')) {
          return '';
        }
        // TODO: this probably does not display correctly when build is on root project
        return build.buildType.projectName + ' :: ' + build.buildType.name;
      };
    })
    .filter('projectName', function () {
      return function (project, defaultName) {
        var isRoot = function (p) {
          return p && !p.parentProjectId;
        };

        if (isRoot(project)) return defaultName;

        if (isRoot(project.parentProject)) return project.name;

        return project.parentProject.name + ' :: ' + project.name;
      }
    })
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
    })
    .service('loadingStatus', function ($timeout) {
      var token,
          self = this;

      this.loading = false;

      this.set = function (value) {
        if (angular.isDefined(token)) {
          $timeout.cancel(token);
        }

        // delay hiding loading indicator
        token = $timeout(function () {
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