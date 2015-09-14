angular.module('checkpoint', [])
    .factory('activeUserHasPermission', function() {
        return jasmine.createSpy('activeUserHasPermission');
    });