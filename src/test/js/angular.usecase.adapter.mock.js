angular.module('angular.usecase.adapter', [])
    .factory('usecaseAdapterFactory', function() {
        var spy = jasmine.createSpy('usecaseAdapterFactorySpy');
        spy.and.callFake(function() { return 'presenter'; });
        return  spy;
    });