basePath = '../';

files = [
    JASMINE,
    JASMINE_ADAPTER,
    'bower_components/angular/angular.js',
    'bower_components/angular-mocks/angular-mocks.js',
    'bower_components/thk-notifications-mock/src/notifications.mock.js',
    'bower_components/thk-web-storage-mock/src/web.storage.mock.js',
    'bower_components/thk-config-mock/src/config.mock.js',
    'bower_components/thk-rest-client-mock/src/rest.client.mock.js',
    'bower_components/angular-route/angular-route.js',
    'bower_components/binarta.i18n.mock.angular/src/i18n.mock.js',
    'src/main/**/*.js',
    'src/test/**/*.js'
];

autoWatch = true;

browsers = ['PhantomJS'];

junitReporter = {
    outputFile: 'test_out/unit.xml',
    suite: 'unit'
};
