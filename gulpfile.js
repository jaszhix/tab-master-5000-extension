var gulp = require('gulp');
var webpack = require('webpack');
var path = require('path');
var webpackStream = require('webpack-stream');
var imagemin = require('gulp-imagemin');
var del = require('del');
var zip = require('gulp-zip');
//var exec = require('child_process').exec;

var plugins = [];
var production = false;
if (production) {
  plugins.push(new webpack.optimize.UglifyJsPlugin({
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
}
var scssIncludePaths = [
  path.join(__dirname, './node_modules')
];
var config = {
  entry: '',
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel'
    },{
      test: /\.css$/,
      loader: 'style-loader!css-loader'
    },{
      test: /\.scss$/,
      loader: 'style-loader!css-loader!sass-loader?outputStyle=compressed&sourceComments=false&' + scssIncludePaths.join('&includePaths[]=')
    },{
      test: /\.(png|jpg|gif)$/,
      loader: 'file-loader?name=[name].[ext]'
    },{
      test: /\.(ttf|eot|svg|woff(2)?)(\S+)?$/,
      loader: 'file-loader?name=[name].[ext]'
    }],
  },
  plugins: plugins,
  output: {
    filename: '',
  }
};
/*gulp.task('reload', ['build-bg'],function(cb) {
    console.log('Pausing watch during ES6 formatting.');
    exec('chrome-extensions-reloader --single-run', function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});*/
gulp.task('build', ['build-bg'], function() {
  config.entry = './app/scripts/components/root.js';
  config.output.filename = 'app.js';
  return gulp.src('./app/scripts/components/root.js')
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('build-bg', ['build-content'],function() {
  config.entry = './app/scripts/bg/bg.js';
  config.output.filename = 'background.js';
  return gulp.src('./app/scripts/background.js')
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('build-content',function() {
  config.entry = './app/scripts/content/content.js';
  config.output.filename = 'content.js';
  return gulp.src('./app/scripts/content.js')
    .pipe(webpackStream(config))
    .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('copy', ['build'], function() {
  del.sync(['./dist/**/**/*']);
  return gulp.src('./app/**/*')
    .pipe(gulp.dest('./dist/'));
});
gulp.task('package', ['copy'], function() {
  del.sync(['./dist/scripts/components/', './dist/scripts/bg/', './dist/scripts/content/']);
  return gulp.src('./dist/**/**/*')
    .pipe(zip('tm5k-dist-' + Date.now() + '.zip'))
    .pipe(gulp.dest('./dist/'));
});
gulp.task('watch', function() {
  gulp.watch('./app/scripts/components/*.{js,jsx,es6}', ['build']);
  gulp.watch('./app/scripts/bg/*.{js,jsx,es6}', ['build-bg']);
  gulp.watch('./app/scripts/content/*.{js,jsx,es6}', ['build-content']);
});

gulp.task('imgmin', function() {
  return gulp.src('./app/images/*.{png,jpg,gif}')
    .pipe(imagemin({
      optimizationLevel: 3,
      interlaced: true
    }))
    .pipe(gulp.dest('./app/images'));
});
gulp.task('default', ['watch'], function() {});
