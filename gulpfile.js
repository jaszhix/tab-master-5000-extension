var gulp = require('gulp');
var uglify = require('gulp-uglify');
var webpack = require('webpack-stream');
var exec = require('child_process').exec;

var production = true; 
var uglifyOpts = null
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
	}
}

gulp.task('build', function() {
    return gulp.src('./app/scripts/components/root.js')
        .pipe(webpack( require('./webpack.config.js') ))
        .pipe(uglify(uglifyOpts))
        .pipe(gulp.dest('./app/scripts/'));
});
gulp.task('format', function(cb) {
    console.log('Pausing watch during ES6 formatting.');
    exec('./media/jason/PrimaryHDD/www/npuff/node_modules/esbeautifier/bin/cli.js ./app/scripts/components/root.js', function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});
gulp.task('watch', function() {
    //gulp.watch('./app/**/*.html', ['html']);
    gulp.watch('./app/scripts/components/*.{js,jsx,es6}', ['build']);
    //gulp.watch('./src/assets/css/**/*.scss', ['sass']);
    //gulp.watch('./app/assets/images/**/*.{png,jpg,gif}', ['images']);
});

gulp.task('default', ['watch'], function () {

});
