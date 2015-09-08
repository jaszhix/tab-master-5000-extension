var gulp = require('gulp');
var uglify = require('gulp-uglify');
var webpack = require('webpack-stream');

var production = false; 
var uglifyOpts = null;
if (production) {
	uglifyOpts = {
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
	};
}
gulp.task('build', function() {
    return gulp.src('./app/scripts/components/root.js')
        .pipe(webpack( require('./webpack.config.js') ))
        .pipe(uglify(uglifyOpts))
        .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('watch', function() {
    gulp.watch('./app/scripts/components/*.{js,jsx,es6}', ['build']);
});

gulp.task('default', ['watch'], function () {
});
