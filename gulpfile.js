const gulp = require('gulp');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const imagemin = require('gulp-imagemin');
const htmlclean = require('gulp-htmlclean');
const del = require('del');
const zip = require('gulp-zip');
const runSequence = require('run-sequence');
const clear = require('clear');
const rename = require('gulp-rename');
const config = require('./webpack.config');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

let plugins = [];
let env = {production: process.env.NODE_ENV === 'production'};
console.log('Configuration in use:', process.env.NODE_ENV);

gulp.task('build', ['build-bg'], function() {
  if (env.production) {
    config.entry = 'app.js';
    config.output.filename = 'app.js';
    config.output.publicPath = '/';
  }
  return gulp.src('./app/scripts/components/app.js')
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('build-bg', ['build-content'], function() {
  config.entry = '../bg/bg.js';
  config.output.filename = 'background.js';
  return gulp.src('./app/scripts/background.js')
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('build-content', function() {
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
gulp.task('firefox-manifest-rename', function() {
  del.sync(['./dist/manifest.json']);
  return gulp.src('./dist/manifest_firefox.json')
    .pipe(rename('manifest.json'))
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
gulp.task('dist',  function (callback) {
  env.production = true;
  runSequence('build', 'copy', 'htmlmin', 'imgmin', 'package', callback);
});
gulp.task('dist-firefox',  function (callback) {
  env.production = true;
  runSequence('build', 'copy', 'htmlmin', 'imgmin', 'firefox-manifest-rename', 'package', callback);
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
 let spawnWatch = function() {
    let proc = require('child_process').spawn('gulp', ['watch'], {stdio: 'inherit'});
    proc.on('close', function (code) {
      spawnWatch();
    });
  };
  spawnWatch();
});
gulp.task('default', ['spawn-watch'], function() {});
