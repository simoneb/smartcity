angular.module('smartcity.services', [])
    .factory('Projects', function (Restangular) {
      return {
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
        set: function (username, password, serverUrl) {
          $window.localStorage.credentials = btoa(username + ':' + password);
          $window.localStorage.serverUrl = serverUrl;
        },
        unset: function () {
          delete $window.localStorage.credentials;
          delete $window.localStorage.serverUrl;
        }
      };
    })
    .factory('ConfigureRestangular', function (Restangular, Credentials) {
      return function () {
        Restangular.setBaseUrl(Credentials.getBaseUrl());
        Restangular.setDefaultHeaders({ authorization: 'Basic ' + Credentials.getBasic()});
      }
    });