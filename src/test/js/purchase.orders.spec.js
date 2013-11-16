describe('purchase.orders.angular', function() {
    var ctrl;
    var scope;
    var usecaseAdapter;
    var presenter = {};
    var rest;
    var config = {};

    beforeEach(module('purchase.orders'));
    beforeEach(module('angular.usecase.adapter'));
    beforeEach(module('rest.client'));
    beforeEach(inject(function($rootScope, usecaseAdapterFactory, restServiceHandler) {
        scope = $rootScope.$new();
        usecaseAdapter = usecaseAdapterFactory;
        usecaseAdapter.andReturn(presenter);
        rest = restServiceHandler;
    }));

    describe('ListPurchaseOrdersController', function() {
        beforeEach(inject(function($controller) {
            ctrl = $controller(ListPurchaseOrderController, {$scope: scope, config: config});
        }));

        describe('on init', function() {
            [
                {baseUri:'base-uri/', text:'with base uri'},
                {baseUri:null, text:'without base uri'}
            ].forEach(function(spec) {
                    describe(spec.text, function() {
                        beforeEach(function() {
                            config.baseUri = spec.baseUri;
                            scope.init();
                        });

                        it('presenter is created', function() {
                            expect(usecaseAdapter.calls[0].args[0]).toEqual(scope);
                        });

                        it('params are populated', function() {
                            expect(presenter.params.method).toEqual('POST');
                            expect(presenter.params.data).toEqual({args: {dummy:'dummy'}});
                            expect(presenter.params.url).toEqual((spec.baseUri  || '') + 'api/query/purchase-order/findByPrincipal');
                            expect(presenter.params.withCredentials).toBeTruthy();
                        });

                        it('rest service is called with presenter', function() {
                            expect(rest.calls[0].args[0]).toEqual(presenter);
                        });

                        it('on success payload is put on scope', function() {
                            var payload = [{id:'1'},{id:'2'}];
                            usecaseAdapter.calls[0].args[1](payload);

                            expect(scope.orders).toEqual(payload);
                        });
                    });
            });
        });
    });
});