// Karma configuration

module.exports = (config) => {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'browserify'],
    files: [
      'test/**/*.js',
    ],
    exclude: [],
    preprocessors: {
      'test/**/*.js': ['browserify'],
    },
    browserify: {
      debug: true,
      transform: [
        ['babelify'],
      ],
    },
    reporters: ['mocha'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['FirefoxHeadless', 'ChromeHeadless'],
    browserNoActivityTimeout: 30000,
    singleRun: true,
    concurrency: Infinity,
  });
};
