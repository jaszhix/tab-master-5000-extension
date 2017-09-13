var fs = require('fs');
var gulp = require('gulp');
var webpack = require('webpack');
var webpackStream = require('webpack-stream');
var imagemin = require('gulp-imagemin');
var htmlclean = require('gulp-htmlclean');
var del = require('del');
var zip = require('gulp-zip');
var runSequence = require('run-sequence');
var clear = require('clear');
var rename = require('gulp-rename');
var config = require('./webpack.config');
//var exec = require('child_process').exec;

var manifest = JSON.parse(fs.readFileSync('./app/manifest.json', 'utf8'));
var packageJSON = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
var increaseVersion = function(opt){
  var version = manifest.version.split('.');
  var index = null;
  if (opt === 'patch') {
    index = 2;
  } else if (opt === 'minor') {
    index = 1;
    version[2] = '0';
  } else if (opt === 'major') {
    index = 0;
    version[1] = '0';
    version[2] = '0';
  }
  var versionNumber = parseInt(version[index]);
  versionNumber = ++versionNumber;
  version[index] = versionNumber.toString();
  manifest.version = version.join('.');
  var data = JSON.stringify(manifest, null, 2);
  fs.writeFile('./app/manifest.json', data, function(err) {
    if (err) {
      console.log(err);
    } else {
      packageJSON.version = manifest.version;
      data = JSON.stringify(packageJSON, null, 2);
      fs.writeFile('./package.json', data, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log('Updated project to version '+manifest.version);
        }
      });
    }
  });
};
var plugins = [];
var env = {production: false};
var uglify = function(){
  if (env.production) { // Needs to check node env
    config.plugins.push(new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        drop_console: true,
        dead_code: true,
        unused: true,
        booleans: true,
        join_vars: true,
        negate_iife: true,
        sequences: true,
        properties: true,
        evaluate: true,
        loops: true,
        if_return: true,
        cascade: true,
        unsafe: true
      },
      output: {
        comments: false
      }
    }));
    plugins.push(new webpack.optimize.OccurenceOrderPlugin(true));
    plugins.push(new webpack.DefinePlugin({
      'process.env': {
         NODE_ENV: JSON.stringify('production')
       }
    }));
    plugins.push(new webpack.optimize.DedupePlugin()),
    plugins.push(new ExtractTextPlugin({ filename: '[name]---[hash].css' }))
  }
};

gulp.task('build', ['build-bg'], function() {
  if (env.production) {
    uglify();
    config.entry = 'app.js';
    config.output.filename = 'app.js';
    config.output.publicPath = '/';
  }
  return gulp.src('./app/scripts/components/app.js')
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('build-bg', ['build-content'],function() {
  uglify();
  config.entry = '../bg/bg.js';
  config.output.filename = 'background.js';
  return gulp.src('./app/scripts/background.js')
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('build-content',function() {
  uglify();
  config.entry = '../content/content.js';
  config.output.filename = 'content.js';
  return gulp.src('./app/scripts/content.js')
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('copy', function() {
  del.sync(['./dist/**/**/*']);
  return gulp.src('./app/**/*')
    .pipe(gulp.dest('./dist/'));
});
gulp.task('htmlmin', function() {
  del.sync('./dist/newtab.html');
  return gulp.src('./dist/newtab_prod.html')
    .pipe(htmlclean())
    .pipe(rename('newtab.html'))
    .pipe(gulp.dest('./dist'));
});
gulp.task('imgmin', function() {
  return gulp.src('./dist/images/*.{png,jpg,gif}')
    .pipe(imagemin({
      optimizationLevel: 7,
      interlaced: true
    }))
    .pipe(gulp.dest('./dist/images'));
});
gulp.task('package', function() {
  del.sync([
    './dist/scripts/components/',
    './dist/scripts/bg/',
    './dist/scripts/content/',
    './dist/styles/*.scss',
    './dist/newtab_prod.html'
    ]);
  return gulp.src('./dist/**/**/*')
    .pipe(zip('tm5k-dist-' + Date.now() + '.zip'))
    .pipe(gulp.dest('./dist/'));
});
gulp.task('patch',  function () {
  increaseVersion('patch');
  runSequence('dist');
});
gulp.task('minor',  function () {
  increaseVersion('minor');
  runSequence('dist');
});
gulp.task('major',  function () {
  increaseVersion('major');
  runSequence('dist');
});
gulp.task('dist',  function (callback) {
  env.production = true;
  runSequence('build', 'copy', 'htmlmin', 'imgmin', 'package', callback);
});
gulp.task('watch', function() {
  //gulp.watch('./app/scripts/components/**/*.{js,jsx,es6}', ['build']);
  gulp.watch('./app/scripts/bg/*.{js,jsx,es6}', ['build-bg']);
  gulp.watch('./app/scripts/content/*.{js,jsx,es6}', ['build-content']);
  gulp.watch('./app/styles/*.scss', ['build']);
});
gulp.task('clear-terminal', function() {
  clear();
});
gulp.task('spawn-watch', ['clear-terminal'], function() {
 var spawnWatch = function() {
    var proc = require('child_process').spawn('gulp', ['watch'], {stdio: 'inherit'});
    proc.on('close', function (code) {
      spawnWatch();
    });
  };
  spawnWatch();
});
gulp.task('default', ['spawn-watch'], function() {});
