var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');

var paths = {
  sass: ['./scss/**/*.scss']
};

gulp.task('default', ['sass']);

gulp.task('sass', function(done) {
  gulp.src('./scss/ionic.app.scss')
    .pipe(sass())
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});

gulp.task('release-android', function(done) {
  sh.exec('cordova build --release android', function(code, output){
    sh.rm('platforms/android/ant-build/smartcity.apk');
    sh.exec('"' +process.env.JAVA_HOME + '/bin/jarsigner.exe" -verbose -sigalg SHA1withRSA -digestalg SHA1 ' +
        '-keystore android-release-key.keystore -storepass QyezKqpSLQkm ' +
        'platforms/android/ant-build/smartcity-release-unsigned.apk android-key', function(code, output){
      sh.exec('"' +process.env['PROGRAMFILES(x86)'] +
          '/Android/android-sdk/build-tools/20.0.0/zipalign.exe" -v 4 ' +
          'platforms/android/ant-build/smartcity-release-unsigned.apk ' +
          'platforms/android/ant-build/smartcity.apk', function(code, output){
        done();
      })
    });
  });
});
