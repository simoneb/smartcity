var buildDateFormat = 'YYYYMMDDTHHmmssZ';

angular.module('smartcity.filters', [])
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
    .filter('buildDuration', function () {

      return function (build) {
        if (build.running) {
          return moment.duration(build['running-info'].elapsedSeconds, 'seconds').humanize();
        }

        var start = moment(build.startDate, buildDateFormat);
        var end = moment(build.finishDate, buildDateFormat);

        return moment.duration(end.diff(start)).humanize();
      };
    })
    .filter('buildEta', function () {
      return function (build) {
        if (!build.running) return;

        var info = build['running-info'];

        return moment.duration(info.estimatedTotalSeconds - info.elapsedSeconds, 'seconds').humanize();
      };
    })
    .filter('buildStartFinish', function ($filter) {
      return function (build) {
        var start = moment(build.startDate, buildDateFormat);
        var end = moment(build.finishDate, buildDateFormat);

        if (build.running) {
          return $filter('date')(build.startDate, 'short') + ' - now';
        }

        if (end.isSame(start, 'day')) {
          return $filter('date')(build.startDate, 'shortDate') + ' ' +
              $filter('date')(build.startDate, 'mediumTime') + ' - ' +
              $filter('date')(build.finishDate, 'mediumTime');
        }

        return $filter('date')(build.startDate, 'short') + ' - ' +
            $filter('date')(build.finishDate, 'short');
      };
    });