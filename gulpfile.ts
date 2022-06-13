import fs from 'fs-extra';
import {execSync} from 'child_process';
import gulp from 'gulp';
import webpackStream from 'webpack-stream';
import imagemin from 'gulp-imagemin';
import htmlclean from 'gulp-htmlclean';
import del from 'del';
import zip from 'gulp-zip';
import rename from 'gulp-rename';
import config from './webpack.config';

const {NODE_ENV, DEV_ENV} = process.env;
let {COMMIT_HASH, SKIP_MINIFY} = process.env;

const PROD = NODE_ENV === 'production';

SKIP_MINIFY = JSON.parse(SKIP_MINIFY || 'false');
const CONTENT_BASE = SKIP_MINIFY ? 'sources' : 'dist';
const WORKDIR = PROD ? CONTENT_BASE : 'app';

if (!COMMIT_HASH) {
  process.env.COMMIT_HASH = COMMIT_HASH = execSync('git log --pretty=format:%h -n 1').toString();
}

fs.ensureDirSync('./releases');

gulp.task('build-bg', function() {
  config.entry = './app/scripts/bg/bg.ts';
  config.output.filename = 'background.js';
  return gulp.src('./app/build/background.js', {allowEmpty: true})
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/build/'));
});

gulp.task('build', gulp.series('build-bg', function() {
  return gulp.src('./app/scripts/components/index.tsx', {allowEmpty: true})
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

gulp.task('copyBundleReports', function() {
  return gulp.src([`./dist/bundleReports/*.html`])
    .pipe(gulp.dest(`./releases/bundleReports/`));
});

gulp.task('htmlmin', function() {
  return gulp.src(`./${WORKDIR}/newtab_prod.html`)
    .pipe(htmlclean())
    .pipe(rename('newtab.html'))
    .pipe(gulp.dest(`./${WORKDIR}`))

    .pipe(gulp.src(`./${WORKDIR}/tm5k_prod.html`))
    .pipe(htmlclean())
    .pipe(rename('tm5k.html'))
    .pipe(gulp.dest(`./${WORKDIR}`))

    .pipe(gulp.src(`./${WORKDIR}/options_prod.html`))
    .pipe(htmlclean())
    .pipe(rename('options.html'))
    .pipe(gulp.dest(`./${WORKDIR}`));
});

gulp.task('imgmin', function() {
  return gulp.src(`./${WORKDIR}/images/*.{png,jpg}`)
    .pipe(imagemin([
      imagemin.mozjpeg({quality: 70, progressive: false}),
      imagemin.optipng({optimizationLevel: 7}),
    ]))
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
      './dist/tm5k_prod.html',
      './dist/options_prod.html',
      './dist/manifest_*',
      './dist/bundleReports',
    ]);
  }

  return gulp.src(`./${WORKDIR}/**/**/*`)
    .pipe(zip(`../releases/tm5k-${WORKDIR}-${DEV_ENV}-${process.env.COMMIT_HASH}.zip`))
    .pipe(gulp.dest(`./${WORKDIR}/`));
}));

gulp.task('dist', gulp.series('copy', 'copyChunks', 'htmlmin', 'imgmin', 'copyBundleReports', 'package', (done) => done()));

gulp.task('watch', function() {
  gulp.watch('./app/scripts/bg/*.ts', gulp.parallel('build-bg'));
  gulp.watch('./app/scripts/shared/*.ts', gulp.parallel('build-bg'));
});

gulp.task('default', gulp.series('watch', (done) => done()));
