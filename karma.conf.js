const path = require('path');

module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', '@angular-devkit/build-angular'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-coverage')
        ],
        client: {
            jasmine: {},
            clearContext: true
        },
        reporters: ['progress'],
        coverageReporter: {
            dir: path.join(__dirname, 'coverage/book-front'),
            subdir: '.',
            reporters: [
                { type: 'html' },
                { type: 'text-summary' },
                { type: 'lcovonly' }
            ],
            check: {
                global: {
                    statements: 28,
                    branches: 21,
                    functions: 23,
                    lines: 30
                }
            }
        },
        customLaunchers: {
            ChromeHeadlessCI: {
                base: 'ChromeHeadless',
                flags: ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox']
            }
        },
        browsers: ['Chrome'],
        restartOnFileChange: true
    });
};
