// Generated on 2015-12-23 using generator-angular-fullstack 3.1.1
'use strict';

var _ = require('lodash');
var del = require('del');
var gulp = require('gulp');
var gutil = require('gulp-util');
var path = require('path');
var gulpLoadPlugins = require('gulp-load-plugins');
var http = require('http');
var open = require('open');
var lazypipe = require('lazypipe');
var wiredep = require('wiredep').stream;
var nodemon = require('nodemon');
var runSequence = require('run-sequence');

var plugins = gulpLoadPlugins();
var config;

const paths = {
    appPath: require('./bower.json').appPath || 'client',
    client: {
        assets: 'client/assets/**/*',
        images: 'client/assets/images/**/*',
        scripts: [
            'client/!(bower_components)/**/*.js',
            'client/bower_components/foodjunky-angular-components/src/**/*.js'
        ],
        styles: [
          'client/{app,components}/**/*.scss',
          'client/bower_components/foodjunky-angular-components/src/**/*.scss'
        ],
        compiledStyles: ['.tmp/{app,components}/**/*.css'],
        mainStyle: 'client/app/app.scss',
        views: 'client/{app,components}/**/*.jade',
        test: ['client/**/*.spec.js'],
        testRequire: [
            'client/bower_components/angular/angular.js',
            'client/bower_components/angular-mocks/angular-mocks.js',
            'client/bower_components/angular-resource/angular-resource.js',
            'client/bower_components/angular-cookies/angular-cookies.js',
            'client/bower_components/angular-sanitize/angular-sanitize.js',
            'client/bower_components/angular-route/angular-route.js',
            'client/**/*.spec.js'
        ],
        bower: 'client/bower_components/'
    },
    server: {
        includes: 'server/views/includes/*.html',
        views: 'server/views/**/*.jade',
        scripts: ['server/**/*.js'],
        json: ['server/**/*.json'],
        test: [
            'server/**/*.spec.js',
            'server/**/*.mock.js',
            'server/**/*.integration.js'
        ]
    },
    karma: 'karma.conf.js',
    dist: 'dist'
};

/********************
 * Helper functions
 ********************/

function onServerLog(log) {
    console.log(plugins.util.colors.white('[') +
        plugins.util.colors.yellow('nodemon') +
        plugins.util.colors.white('] ') +
        log.message);
}

function checkAppReady(cb) {
    var options = {
        host: 'localhost',
        port: config.port
    };
    http
        .get(options, () => cb(true))
        .on('error', () => cb(false));
}

// Call page until first success
function whenServerReady(cb) {
    var serverReady = false;
    var appReadyInterval = setInterval(() =>
        checkAppReady((ready) => {
            if (!ready || serverReady) {
                return;
            }
            clearInterval(appReadyInterval);
            serverReady = true;
            cb();
        }),
        100);
}

/********************
 * Reusable pipelines
 ********************/

let lintClientScripts = lazypipe()
    .pipe(plugins.jshint, 'client/.jshintrc')
    .pipe(plugins.jshint.reporter, 'jshint-stylish');

let lintServerScripts = lazypipe()
    .pipe(plugins.jshint, 'server/.jshintrc')
    .pipe(plugins.jshint.reporter, 'jshint-stylish');

let styles = lazypipe()
    .pipe(plugins.sourcemaps.init)
    .pipe(plugins.sass, { includePaths: [
      'client/bower_components',
      'client/components',
      'client/app'
    ] })
    .pipe(plugins.autoprefixer, {browsers: ['last 1 version']})
    .pipe(plugins.sourcemaps.write, '.');

/********************
 * Env
 ********************/

gulp.task('env:all', () => {
    let localConfig;
    try {
        localConfig = require('./server/config/local.env');
    } catch (e) {
        localConfig = {};
    }
    plugins.env({
        vars: localConfig
    });
});
gulp.task('env:test', () => {
    plugins.env({
        vars: {NODE_ENV: 'test'}
    });
});
gulp.task('env:prod', () => {
    plugins.env({
        vars: {NODE_ENV: 'production'}
    });
});

/********************
 * Tasks
 ********************/

gulp.task('inject', cb => {
  runSequence(['inject:js', 'inject:css', 'inject:sass'], cb);
});

var rootRegex = /app\/[^\/]*$/;

function pathComparator(a, b) {

  if (rootRegex.test(a.relative)) {
    return -1;
  }

  if (rootRegex.test(b.relative)) {
    return 1;
  }

  return a.path.localeCompare(b.path);

}

gulp.task('inject:js', () => {
  return gulp.src(paths.server.includes)
    .pipe(plugins.inject(
      gulp.src(_.union(paths.client.scripts, ['!client/**/*.spec.js']), {read: false})
        .pipe(plugins.sort(pathComparator)),
      {
        starttag: '<!-- injector:js -->',
        endtag: '<!-- endinjector -->',
        transform: (filepath) => '<script src="' + filepath.replace('/client/', '') + '"></script>'
      }))
    .pipe(gulp.dest('server/views/includes'));
});

gulp.task('inject:css', () => {
  return gulp.src(paths.server.includes)
    .pipe(plugins.inject(
      gulp.src('client/{app,components}/**/*.css', {read: false})
        .pipe(plugins.sort()),
      {
        starttag: '<!-- injector:css -->',
        endtag: '<!-- endinjector -->',
        transform: (filepath) => '<link rel="stylesheet" href="' + filepath.replace('/client/', '') + '"/>'
      }))
    .pipe(gulp.dest('server/views/includes'));
});

gulp.task('inject:sass', () => {
    return gulp.src('client/app/app.scss')
        .pipe(plugins.inject(
            gulp.src(_.union(paths.client.styles, ['!' + paths.client.mainStyle]), {read: false})
                .pipe(plugins.sort()),
            {
                starttag: '// injector',
                endtag: '// endinjector',
                transform: (filepath) => {
                    let newPath = filepath
                        .replace('/client/app/', '')
                        .replace('/client/components/', '../components/')
                        .replace('/client/bower_components/', '../bower_components/')
                        //.replace(/_(.*).scss/, (match, p1, offset, string) => p1)
                        .replace('.scss', '');
                    return '@import \'' + newPath + '\';';
                }
            }))
        .pipe(gulp.dest('client/app'));
});

gulp.task('styles', () => {
    return gulp.src(paths.client.mainStyle)
        .pipe(styles())
        .pipe(gulp.dest('.tmp/app'));
});

gulp.task('lint:scripts', cb => runSequence(['lint:scripts:client', 'lint:scripts:server'], cb));

gulp.task('lint:scripts:client', () => {
    return gulp.src(_.union(paths.client.scripts, _.map(paths.client.test, blob => '!' + blob)))
        .pipe(lintClientScripts());
});

gulp.task('lint:scripts:server', () => {
    return gulp.src(_.union(paths.server.scripts, _.map(paths.server.test, blob => '!' + blob)))
        .pipe(lintServerScripts());
});

gulp.task('clean:tmp', () => del(['.tmp/**/*']));

gulp.task('start:client', cb => {
    whenServerReady(() => {
        open('http://localhost:' + config.port);
        cb();
    });
});

gulp.task('start:debug', () => {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    config = require('./server/config/environment');
    nodemon('-x node-debug -w server -w ../core-js -w node_modules/foodjunky -e js,jade,html server')
        .on('log', onServerLog);
});

gulp.task('start:server', () => {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    config = require('./server/config/environment');
    nodemon('-w server -w ../core-js -w node_modules/foodjunky server')
        .on('log', onServerLog);
});

gulp.task('watch', () => {
    var testFiles = _.union(paths.client.test, paths.server.test);

    plugins.livereload.listen();

    plugins.watch(paths.client.styles, () => {  //['inject:sass']
        gulp.src(paths.client.mainStyle)
            .pipe(plugins.plumber())
            .pipe(styles())
            .pipe(gulp.dest('.tmp/app'));
            //.pipe(plugins.livereload());
    });

    plugins.watch(paths.client.compiledStyles)
        .pipe(plugins.plumber())
        .pipe(plugins.livereload());

    plugins.watch(paths.client.views)
        .pipe(plugins.plumber())
        .pipe(plugins.jade())
        .pipe(gulp.dest('.tmp'))
        .pipe(plugins.livereload());

    plugins.watch(paths.server.views)
        .pipe(plugins.plumber())
        .pipe(plugins.livereload());

    plugins.watch(paths.client.scripts) //['inject:js']
        .pipe(plugins.plumber())
        .pipe(lintClientScripts())
        .pipe(plugins.livereload());

    plugins.watch(_.union(paths.server.scripts, testFiles))
        .pipe(plugins.plumber())
        .pipe(lintServerScripts())
        .pipe(plugins.livereload());

    gulp.watch('bower.json', [ 'wiredep:server' ]);
});

gulp.task('debug', cb => {
    runSequence('clean:tmp',
        ['lint:scripts', 'inject'],
        'wiredep:server',
        ['jade', 'styles', 'env:all'],
        ['start:debug', 'start:client'],
        'watch',
        cb);
});

gulp.task('serve', cb => {
    runSequence('clean:tmp',
        ['lint:scripts', 'inject'],
        'wiredep:server',
        ['jade', 'styles', 'env:all'],
        ['start:server', 'start:client'],
        'watch',
        cb);
});

gulp.task('test', cb => {
    return runSequence('test:server', 'test:client', cb);
});

gulp.task('test:server', cb => {
    runSequence(
        'env:all',
        'env:test',
        'mocha:unit',
        //'mocha:coverage',
        cb);
});

gulp.task('mocha:unit', () => {
    return gulp.src(paths.server.test)
        .pipe(plugins.mocha({
            reporter: 'spec',
            require: [
                './mocha.conf'
            ]
        }))
        .once('end', function() {
            process.exit();
        });
});

gulp.task('test:client', () => {
    let testFiles = _.union(paths.client.testRequire, paths.client.test);
    return gulp.src(testFiles)
        .pipe(plugins.karma({
            configFile: paths.karma,
            action: 'watch'
        }));
});

// inject bower components
gulp.task('wiredep:server', () => {
    return gulp.src(paths.server.includes)
        .pipe(wiredep({
            exclude: [
                /auth0.*/,
                /bootstrap-sass-official/,
                /bootstrap.js/,
                /json3/,
                /es5-shim/,
                /foodjunky-angular-components/,
                /bootstrap.css/,
                /font-awesome.css/
            ],
            ignorePath: '../../../' + paths.appPath + '/'
        }))
        .pipe(gulp.dest('server/views/includes'));
});

gulp.task('wiredep:test', () => {
    gulp.src(paths.karma)
        .pipe(wiredep({
            exclude: [
                /auth0.*/,
                /bootstrap-sass-official/,
                /bootstrap.js/,
                /json3/,
                /es5-shim/,
                /foodjunky-angular-components/,
                /bootstrap.css/,
                /font-awesome.css/
            ],
            devDependencies: true
        }))
        .pipe(gulp.dest('./'));
});

/********************
 * Build
 ********************/

gulp.task('build', cb => {
  runSequence(
    'clean:dist',
    'inject',
    'wiredep:server',
    [ 'jade', 'copy:client', 'copy:assets', 'copy:server' ],
    [ 'build:images', 'build:refs' ],
    cb);
});

gulp.task('clean:dist', () => del(['dist/**', 'dist.zip']));

gulp.task('html', cb => {
  return runSequence('html:components', 'html:static', 'html:site', cb);
});

gulp.task('html:components', function() {
  return gulp.src([
    'client/{components,x}/**/*.html',
    '.tmp/{components,x}/**/*.html'
  ])
    .pipe(plugins.angularTemplatecache({
      filename: 'templates-components.js',
      module: 'fj.components'
    }))
    .pipe(gulp.dest('.tmp'));
});

gulp.task('html:static', function() {
  return gulp.src([
    'client/{app,x}/standalone/**/*.html',
    '.tmp/{app,x}/standalone/**/*.html'
  ])
    .pipe(plugins.angularTemplatecache({
      filename: 'templates-static.js',
      module: 'fj.static'
    }))
    .pipe(gulp.dest('.tmp'));
});

gulp.task('html:site', function() {
  return gulp.src([
    'client/{app,x}/**/*.html',
    '.tmp/{app,x}/**/*.html'
  ])
    .pipe(plugins.angularTemplatecache({
      filename: 'templates-site.js',
      module: 'fj.site'
    }))
    .pipe(gulp.dest('.tmp'));
});

gulp.task('jade', cb => {
  return gulp.src(paths.client.views)
    .pipe(plugins.jade())
    .pipe(gulp.dest('.tmp'));
});

gulp.task('copy:client', () => {
    return gulp.src([
        '.htaccess',
        'favicon.ico',
        'robots.txt',
        'bower_components/es5-shim/**',
        'bower_components/json3/**',
        'bower_components/ace-builds/**',
        'bower_components/auth0-lock/**',
        'bower_components/auth0-angular/**',
        'bower_components/bootstrap-sass-official/**',
        'bower_components/font-awesome/**'
    ], { dot: true, cwdbase: true, cwd: 'client' })
        .pipe(gulp.dest(paths.dist + '/client'));
});

gulp.task('copy:assets', () => {
  return gulp.src([paths.client.assets, '!' + paths.client.images])
    .pipe(gulp.dest(paths.dist + '/client/assets'));
});

gulp.task('copy:server', () => {
    return gulp.src([
        'package.json',
        'bower.json',
        '.bowerrc',
        '.ebextensions/**',
        'server/**',
        'client/*.xml'
    ], { cwdbase: true })
        .pipe(gulp.dest(paths.dist));
});

gulp.task('build:images', () => {
  // Not optimizing images at build time, slow AF
  //return gulp.src('client/assets/images/**/*')
  //  .pipe(plugins.imagemin({
  //    optimizationLevel: 5,
  //    progressive: true,
  //    interlaced: true
  //  }))
  return gulp.src(paths.client.images)
    .pipe(gulp.dest(paths.dist + '/client/assets/images'));
});

// This is where the magic happens
gulp.task('build:refs', ['styles', 'html'], () => {

    var appFilter = plugins.filter('**/app.js');
    var jsFilter = plugins.filter('**/*.js');
    var cssFilter = plugins.filter('**/*.css');
    var htmlFilter = plugins.filter('**/*.html');
    var assetsFilter = plugins.filter('**/*.{js,css}');

    // Find all JS/CSS assets in the client directories
    let assets = plugins.useref.assets({ searchPath: ['.tmp', 'client'] });

    // Process all HTML templates to replace include blocks with optimized versions
    return gulp.src([
      paths.server.includes,
      'client/**/*.html',
      '.tmp/**/*.html',
      '!client/bower_components/**/*'
    ], { base: '.' })
        // Change pipeline to asset stream for file concatenation
        .pipe(assets)
          // Append static template cache to app.js
          .pipe(appFilter)
            .pipe(plugins.addSrc.append('.tmp/templates-*.js'))
            .pipe(plugins.concat('app/app.js'))
          .pipe(appFilter.restore())
          // Annotate Angular modules, minify JS and concatenate
          .pipe(jsFilter)
            .pipe(plugins.ngAnnotate())
            .pipe(plugins.uglify().on('error', gutil.log))
          .pipe(jsFilter.restore())
          // MInify CSS and concatenate
          .pipe(cssFilter)
            .pipe(plugins.minifyCss({
              cache: true,
              processImportFrom: ['!fonts.googleapis.com']
            }))
          .pipe(cssFilter.restore())
          // Rename concatenated files to be unique/versioned
          .pipe(plugins.rev())
          // Output concatenated files to dist/client
          .pipe(gulp.dest(paths.dist + '/client'))
        // Back to the HTML file processing
        .pipe(assets.restore())
        // Replace JS/CSS include blocks in HTML with concatenated refs
        .pipe(plugins.useref())
        // Replace concatenated ref with versioned ref
        .pipe(plugins.revReplace())
        // Redirect .tmp/ source files to client/
        .pipe(plugins.rename((p) => {
          p.dirname = p.dirname.replace('.tmp/', 'client/');
        }))
        // Output remaining HTML templates to dist/
        .pipe(htmlFilter)
          .pipe(gulp.dest(paths.dist))
        .pipe(htmlFilter.restore());

});

gulp.task('sitemap:prod', function(done) {
  var config = require('./env/prod.js');
  require('./sitemap/build')(config, './client')
    .then(() => {
      done();
      process.exit(0);
    });
});

gulp.task('sitemap:beta', function(done) {
  var config = require('./env/prod.js');
  require('./sitemap/build')(config, './client', 'https://beta.foodjunky.com', 'beta-sitemap')
    .then(() => {
      done();
      process.exit(0);
    });
});

gulp.task('run:dev', [ 'build' ], function () {

  let localConfig;

  try {
      localConfig = require('./env/dev.js');
  } catch (e) {
      localConfig = {};
  }
  localConfig.NODE_ENV = 'staging';

  plugins.env({
      vars: localConfig
  });

  require('./dist/server');

});

gulp.task('config:dev', function(cb) {
  plugins.ebConfig({
    region: 'us-east-1',
    profile: 'foodjunky',
    application: 'foodjunky-site',
    environment: 'site-dev',
    settings: _.merge({
        NODE_ENV: 'production'
      },
      require('./env/dev.js')
    )
  }).run(cb);
});

gulp.task('config:staging', function(cb) {
  plugins.ebConfig({
    region: 'us-east-1',
    profile: 'foodjunky',
    application: 'foodjunky-site',
    environment: 'site-staging',
    settings: _.merge({
        NODE_ENV: 'production'
      },
      require('./env/staging.js')
    )
  }).run(cb);
});

gulp.task('config:prod', function(cb) {
  plugins.ebConfig({
    region: 'us-east-1',
    profile: 'foodjunky',
    application: 'foodjunky-site',
    environment: 'site-prod',
    settings: _.merge({
        NODE_ENV: 'production'
      },
      require('./env/prod.js')
    )
  }).run(cb);
});

gulp.task('deploy', [ 'deploy:dev' ]);

gulp.task('deploy:package', [ 'build' ], function () {
  return gulp.src('dist/**', { base: 'dist', dot: true })
    .pipe(plugins.zip('dist.zip'))
    .pipe(gulp.dest('.'));
});

gulp.task('deploy:dev', [ 'build' ], function () {
  return gulp.src('dist/**', { base: 'dist', dot: true })
    .pipe(plugins.zip('dist.zip'))
    .pipe(plugins.ebDeploy({
      region: 'us-east-1',
      profile: 'foodjunky',
      application: 'foodjunky-site',
      environment: 'site-dev'
    }));
});

gulp.task('deploy:staging', [ 'build' ], function () {
  return gulp.src('dist/**', { base: 'dist', dot: true })
    .pipe(plugins.zip('dist.zip'))
    .pipe(plugins.ebDeploy({
      region: 'us-east-1',
      profile: 'foodjunky',
      application: 'foodjunky-site',
      environment: 'site-staging'
    }));
});
