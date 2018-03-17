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
const exec = require('child_process').exec;

let env = {production: process.env.NODE_ENV === 'production'};

const PROD = process.env.NODE_ENV === 'production';
const SKIP_MINIFY = JSON.parse(process.env.SKIP_MINIFY || 'false');
const CONTENT_BASE = SKIP_MINIFY ? 'sources' : 'dist';
const WORKDIR = PROD ? CONTENT_BASE : 'app';

gulp.task('build', ['build-bg'], function() {
  return gulp.src('./app/scripts/components/app.js')
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('build-bg', function() {
  config.entry = './app/scripts/bg/bg.js';
  config.output.filename = 'background.js';
  return gulp.src('./app/scripts/background.js')
    .pipe(webpackStream(config, require('webpack')))
    .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('backup-source-maps', function() {
  return gulp.src(`./${WORKDIR}/scripts/*.map`)
    .pipe(gulp.dest(`./source_maps/${process.env.DEV_ENV}/${WORKDIR}/`));
});
gulp.task('clean', function() {
  return del([`./${WORKDIR}/**/**/*`]);
});
gulp.task('copy', function() {
  let patterns = [
    './app/**/**/**/**/*.{js,html,png,jpg,gif,css,scss,json,woff,ttf,eot,svg}',
    '!./app/scripts/app.js',
    '!./app/scripts/background.js',
    '!./app/scripts/content.js',
    '!./app/scripts/main.worker.js',
    '!./app/manifest.json'
  ];
  if (SKIP_MINIFY) {
    patterns.push('!./app/scripts/components', '!./app/scripts/bg', '!./app/scripts/content');
  }
  return gulp.src(patterns)
    .pipe(gulp.dest(`./${WORKDIR}/`));
});
gulp.task('htmlmin', function() {
  return gulp.src(`./${WORKDIR}/newtab_prod.html`)
    .pipe(htmlclean())
    .pipe(rename('newtab.html'))
    .pipe(gulp.dest(`./${WORKDIR}`));
});
gulp.task('imgmin', function() {
  return gulp.src(`./${WORKDIR}/images/*.{png,jpg,gif}`)
    .pipe(imagemin({
      optimizationLevel: 7,
      interlaced: true
    }))
    .pipe(gulp.dest(`./${WORKDIR}/images`));
});
gulp.task('package', ['backup-source-maps'], function() {
  if (!SKIP_MINIFY) {
    del.sync([
      './dist/scripts/components/',
      './dist/scripts/bg/',
      './dist/scripts/content/',
      './dist/scripts/*.map',
      './dist/styles/*.scss',
      './dist/newtab_prod.html',
      './dist/manifest_*'
    ]);
  }
  return gulp.src(`./${WORKDIR}/**/**/*`)
    .pipe(zip(`tm5k-${WORKDIR}-${Date.now()}.zip`))
    .pipe(gulp.dest(`./${WORKDIR}/`));
});
gulp.task('dist',  function (callback) {
  env.production = true;
  runSequence('copy', 'htmlmin', 'imgmin', 'package', callback);
});
gulp.task('watch', function() {
  gulp.watch('./app/scripts/bg/*.{js,jsx,es6}', ['build-bg']);
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
