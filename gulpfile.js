var gulp = require('gulp'),
	webserver = require('gulp-webserver'),
	concat = require("gulp-concat"),
	uglify = require('gulp-uglify'),
	htmlmin = require('gulp-htmlmin'),
	sass = require('gulp-sass'),
	livereload = require('gulp-livereload'),
	bower = require('bower'),
	concatvendor = require('gulp-concat-vendor'),
	underscore = require('underscore'),
	underscoreStr = require('underscore.string'),
	imageop = require('gulp-image-optimization'),
	nano = require('gulp-cssnano'),
  merge = require('merge-stream'),
  Server = require('karma').Server;

var src = "public/src",
	dist = "public/dist",
	paths = {
		js: src + '/js/**/*.js',
		scss: src + '/scss/styles.scss',
		html: src + '/**/*.html',
		json: src + '/data/**/*.json',
		img: [src + '/img/**/*.png', src + '/img/**/*.jpg', src + '/img/**/*.gif', src + '/img/**/*.jpeg']
	},
	exclude = [ 'lib1', 'lib2' ];

// Start a webserver @ localhost:8000 (task watch)
gulp.task('server', function () {  
	return gulp.src(dist + '/')
		.pipe(webserver());
});

// Bower
gulp.task('bower', function(cb){
  bower.commands.install([], {save: true}, {})
    .on('end', function(installed){
      cb(); // notify gulp that this task is finished
    });
});


// +++++++ VENDOR FILE (not included in the watch default)
// Concat vendor files
gulp.task('vendorJS', ['bower'], function(){
  var bowerFile = require('./bower.json');
  var bowerPackages = bowerFile.dependencies;
  var bowerDir = './bower_components';
  var packagesOrder = [];
  var mainFiles = [];

  // Function for adding package name into packagesOrder array in the right order
  function addPackage(name){
    // package info and dependencies
    var info = require(bowerDir + '/' + name + '/bower.json');
    var dependencies = info.dependencies;
    
    // add dependencies by repeat the step
    if(!!dependencies){
      underscore.each(dependencies, function(value, key){
        if(exclude.indexOf(key) === -1){
          addPackage(key);
        }
      });
    }
    
    // and then add this package into the packagesOrder array if they are not exist yet
    if(packagesOrder.indexOf(name) === -1){
      packagesOrder.push(name);
    }
  }

  // calculate the order of packages
  underscore.each(bowerPackages, function(value, key){
    if(exclude.indexOf(key) === -1){ // add to packagesOrder if it's not in exclude
      addPackage(key);
    }
  });

  // get the main files of packages base on the order
  underscore.each(packagesOrder, function(bowerPackage){
    var info = require(bowerDir + '/' + bowerPackage + '/bower.json');
    var main = info.main;
    var mainFile = main;

    // get only the .js file if mainFile is an array
    if(underscore.isArray(main)){
      underscore.each(main, function(file){
        if(underscoreStr.endsWith(file, '.js')){
          mainFile = file;
        }
      });
    }

    // make the full path
    mainFile = bowerDir + '/' + bowerPackage + '/' + mainFile;

    // only add the main file if it's a js file
    if(underscoreStr.endsWith(mainFile, '.js')){
      mainFiles.push(mainFile);
    }
  });

  // run the gulp stream
  return gulp.src(mainFiles)
    .pipe(concat('/vendor.js'))
    .pipe(uglify())
    .pipe(gulp.dest(dist + '/js'));
});
gulp.task('vendorCSS', function(){
	var bower = './bower_components/',
		vendorFiles = [bower + 'bootstrap/dist/css/bootstrap.css', bower + 'font-awesome/css/font-awesome.css', 'https://fonts.googleapis.com/css?family=Raleway:400,700,900', 'https://fonts.googleapis.com/css?family=Yanone+Kaffeesatz:700'],
    vendorFontsFiles = [bower + 'bootstrap/fonts/*.*', bower + 'font-awesome/fonts/*.*'];

	var cssFiles = gulp.src(vendorFiles)
		.pipe(concat('vendor.css'))
		.pipe(nano())
		.pipe(gulp.dest(dist + '/css'));

  var fontFiles = gulp.src(vendorFontsFiles)
    .pipe(gulp.dest(dist + '/fonts'));

  return merge(cssFiles, fontFiles);
});
// +++++++ END VENDOR FILE

// Optimize & minify images
gulp.task('images', function(cb) {
	return gulp.src(paths.img).pipe(imageop({
		optimizationLevel: 5,
		progressive: true,
		interlaced: true
	})).pipe(gulp.dest(dist + '/img')).on('end', cb).on('error', cb);
});

// Copy all data JSON (task watch)
gulp.task('copy-json', function () {  
	return gulp.src(paths.json)
		.pipe(gulp.dest(dist + '/data'));
});

// Combine & Compress JS into one script.js (task watch)
gulp.task('combine-js', function () {  
	return gulp.src(paths.js)
		.pipe(concat('script.js'))
		//.pipe(uglify())
		.pipe(gulp.dest(dist + '/js'));
});


// Compile sass to css (task watch)
gulp.task('compile-sass', function () {  
	return gulp.src(paths.scss)
		.pipe(sass())
    .pipe(nano())
		.pipe(gulp.dest(dist + '/css'));
});

// Compress HTML (task watch)
gulp.task('compress-html', function () {  
	return gulp.src(paths.html)
		.pipe(htmlmin())
		.pipe(gulp.dest(dist + '/'));
});



// Watch files and reload browser
gulp.task('watch', function () {  
	livereload.listen();
	gulp.watch(paths.js, ['combine-js']);
	gulp.watch(paths.json, ['copy-json']);
	gulp.watch(src + '/**/*.scss').on('change', function(file){
    livereload.changed(file.path);
    gulp.watch(paths.scss, ['compile-sass']);
  });
	gulp.watch(paths.html, ['compress-html']);
	gulp.watch(dist + '/**').on('change', livereload.changed);
});

gulp.task('version', function () {
  var pkg = require('package.json')
  return string_src("version", pkg.version)
    .pipe(gulp.dest('build/'))
})


gulp.task('test', function(done){
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done).start();
});

gulp.task('tdd', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js'
  }, done).start();
});

gulp.task('default', [  
  'server', 'combine-js', 'copy-json',
  'compile-sass', 'compress-html', 
  'watch', 'tdd' ]);