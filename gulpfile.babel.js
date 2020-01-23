const fs = require('fs-extra');
const {execSync} = require('child_process');
const gulp = require('gulp');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const imagemin = require('gulp-imagemin');
const htmlclean = require('gulp-htmlclean');
const del = require('del');
const zip = require('gulp-zip');
const rename = require('gulp-rename');
const config = require('./webpack.config');

const {NODE_ENV, DEV_ENV} = process.env;
let {COMMIT_HASH, SKIP_MINIFY} = process.env;

const PROD = NODE_ENV === 'production';
SKIP_MINIFY = JSON.parse(SKIP_MINIFY || 'false');
const CONTENT_BASE = SKIP_MINIFY ? 'sources' : 'dist';
const WORKDIR = PROD ? CONTENT_BASE : 'app';

if (!COMMIT_HASH) {
  process.env.COMMIT_HASH = COMMIT_HASH = execSync('git log --pretty=format:\'%h\' -n 1');
}

fs.ensureDirSync('./releases');

gulp.task('build-bg', function() {
  config.entry = './app/scripts/bg/bg.ts';
  config.output.filename = 'background.js';
  return gulp.src('./app/scripts/background.js', {allowEmpty: true})
    .pipe(webpackStream(config, webpack))
    .pipe(gulp.dest('./app/scripts/'));
});

gulp.task('build', gulp.series('build-bg', function() {
  return gulp.src('./app/scripts/components/app.tsx', {allowEmpty: true})
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/scripts/'));
}));

gulp.task('backup-source-maps', function() {
  return gulp.src(`./${WORKDIR}/scripts/*.map`)
    .pipe(gulp.dest(`./source_maps/${DEV_ENV}/${WORKDIR}/`));
});

gulp.task('clean', function() {
  return del([`./${WORKDIR}/**/**/*`]);
});

gulp.task('copy', function() {
  const patterns = [
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

gulp.task('copyChunks', function() {
  return gulp.src([`./${WORKDIR}/scripts/*.app.js`])
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

gulp.task('package', gulp.series('backup-source-maps', function() {
  if (!SKIP_MINIFY) {
    del.sync([
      './dist/scripts/*.app.js',
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
    .pipe(zip(`../releases/tm5k-${WORKDIR}-${DEV_ENV}-${process.env.COMMIT_HASH}.zip`))
    .pipe(gulp.dest(`./${WORKDIR}/`));
}));

gulp.task('dist', gulp.series('copy', 'copyChunks', 'htmlmin', 'imgmin', 'package', (done) => done()));

gulp.task('watch', function(done) {
  const glob = './app/scripts/bg/*.{ts}';
  gulp.watch(glob)
    .on('change', gulp.parallel('build-bg'));
  done();
});

gulp.task('default', gulp.series('watch', (done) => done()));
