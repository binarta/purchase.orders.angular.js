describe('purchase.orders.angular', function () {
    var ctrl;
    var scope;
    var usecaseAdapter;
    var presenter = {};
    var rest;
    var config = {};
    var location;
    var self = this;
    var fetchAccountMetadata = function(it) {
        if (authorized) it.ok(accountMetadata);
        else it.unauthorized();
    };
    var authorized = true;
    var accountMetadata = {principal:'principal'};

    beforeEach(module('purchase.orders'));
    beforeEach(module('angular.usecase.adapter'));
    beforeEach(module('rest.client'));
    beforeEach(module('web.storage'));
    beforeEach(module('config'));
    beforeEach(module('notifications'));
    beforeEach(inject(function ($rootScope, usecaseAdapterFactory, restServiceHandler, $location, topicMessageDispatcherMock) {
        scope = $rootScope.$new();
        usecaseAdapter = usecaseAdapterFactory;
        usecaseAdapter.andReturn(presenter);
        rest = restServiceHandler;
        location = $location;
        self.topicMessageDispatcherMock = topicMessageDispatcherMock;
    }));

    afterEach(function () {
        config = {};
        presenter = {};
    });

    function request() {
        return rest.calls[0].args[0];
    }

    describe('ListPurchaseOrdersController', function () {
        beforeEach(inject(function ($controller) {
            authorized = true;
            ctrl = $controller(ListPurchaseOrderController, {$scope: scope, config: config, fetchAccountMetadata:fetchAccountMetadata});
        }));

        describe('on decorator', function() {
            [
                {status: 'pending-approval-by-customer', statusLevel: 'info'},
                {status: 'payment-approved-by-customer', statusLevel: 'info'},
                {status: 'payment-approved-by-vendor', statusLevel: 'info'},
                {status: 'refund-pending', statusLevel: 'info'},
                {status: 'in-transit', statusLevel: 'info'},
                {status: 'shipping-pending', statusLevel: 'info'},
                {status: 'review-pending', statusLevel: 'warning'},
                {status: 'canceled', statusLevel: 'danger'},
                {status: 'refunded', statusLevel: 'success'},
                {status: 'paid', statusLevel: 'success'},
                {status: 'shipped', statusLevel: 'success'}
            ].forEach(function(input) {
                it('test', function() {
                    var order = {status:input.status};
                    scope.decorator(order);
                    expect(order.statusLevel).toEqual(input.statusLevel);
                })
            });

            describe('for bootstrap2', function() {
                beforeEach(function() {
                    config.styling = 'bootstrap2';
                });

                [
                    {status: 'pending-approval-by-customer', statusLevel: 'info'},
                    {status: 'payment-approved-by-customer', statusLevel: 'info'},
                    {status: 'payment-approved-by-vendor', statusLevel: 'info'},
                    {status: 'refund-pending', statusLevel: 'info'},
                    {status: 'in-transit', statusLevel: 'info'},
                    {status: 'shipping-pending', statusLevel: 'info'},
                    {status: 'review-pending', statusLevel: 'warning'},
                    {status: 'canceled', statusLevel: 'important'},
                    {status: 'refunded', statusLevel: 'success'},
                    {status: 'paid', statusLevel: 'success'},
                    {status: 'shipped', statusLevel: 'success'}
                ].forEach(function(input) {
                    it('test', function() {
                        var order = {status:input.status};
                        scope.decorator(order);
                        expect(order.statusLevel).toEqual(input.statusLevel);
                    })
                })
            });

        });

        describe('on filters customizer', function() {
            var filters;
            var promiseWasResolved;

            beforeEach(function() {
                filters = {};
                promiseWasResolved = false;
            });

            function filter() {
                scope.filtersCustomizer({filters: filters}).then(promiseWasResolved = true);
                scope.$root.$digest();
            }

            function assertPromiseWasResolved() {
                expect(promiseWasResolved).toBeTruthy();
            }

            it('when authenticated expose principal on filters', function() {
                filter();
                expect(filters.owner).toEqual(accountMetadata.principal);
                assertPromiseWasResolved();
            });

            it('when unauthenticated nothing is exposed on filters', function() {
                authorized = false;
                filter();
                expect(filters.owner).toBeUndefined();
                assertPromiseWasResolved();
            })
        });
    });

    describe('ViewPurchaseOrderController', function () {
        beforeEach(inject(function ($controller) {
            ctrl = $controller(ViewPurchaseOrderController, {$scope: scope, config: config});
            config.baseUri = 'base-uri/';
        }));

        describe('on init with route params', function () {
            beforeEach(inject(function($routeParams) {
                $routeParams.id = 'id';
                $routeParams.owner = 'owner';
                scope.init();
            }));

            it('request is sent', inject(function () {
                expect(request().params).toEqual({
                    method: 'GET',
                    params: {
                        id: 'id',
                        owner: 'owner',
                        treatInputAsId: true
                    },
                    url: config.baseUri + 'api/entity/purchase-order',
                    withCredentials: true
                })
            }));

            [
                {status: 'pending-approval-by-customer', expectedStatusLevel: 'info'},
                {status: 'payment-approved-by-customer', expectedStatusLevel: 'info'},
                {status: 'payment-approved-by-vendor', expectedStatusLevel: 'info'},
                {status: 'refund-pending', expectedStatusLevel: 'info'},
                {status: 'in-transit', expectedStatusLevel: 'info'},
                {status: 'shipping-pending', expectedStatusLevel: 'info'},
                {status: 'review-pending', expectedStatusLevel: 'warning'},
                {status: 'canceled', expectedStatusLevel: 'danger'},
                {status: 'refunded', expectedStatusLevel: 'success'},
                {status: 'paid', expectedStatusLevel: 'success'},
                {status: 'shipped', expectedStatusLevel: 'success'}
            ].forEach(function (order) {
                it('expose status level as function', inject(function() {
                    expect(scope.statusLevel(order.status)).toEqual(order.expectedStatusLevel);
                }));

                describe('and order is found', function() {
                    beforeEach(function() {
                        request().success(order);
                    });

                    it('payload is exposed on scope as order', inject(function() {
                        expect(scope.order).toEqual(order);
                    }));

                    it('statusLevel is exposed on order', function () {
                        expect(scope.order.statusLevel).toEqual(order.expectedStatusLevel);
                    });
                });
            });

            describe('when bootstrap 2', function () {
                beforeEach(inject(function($routeParams) {
                    $routeParams.id = 'id';
                    $routeParams.owner = 'owner';
                    config.styling = 'bootstrap2';
                }));

                [
                    {status: 'pending-approval-by-customer', expectedStatusLevel: 'info'},
                    {status: 'payment-approved-by-customer', expectedStatusLevel: 'info'},
                    {status: 'payment-approved-by-vendor', expectedStatusLevel: 'info'},
                    {status: 'refund-pending', expectedStatusLevel: 'info'},
                    {status: 'in-transit', expectedStatusLevel: 'info'},
                    {status: 'shipping-pending', expectedStatusLevel: 'info'},
                    {status: 'review-pending', expectedStatusLevel: 'warning'},
                    {status: 'canceled', expectedStatusLevel: 'important'},
                    {status: 'refunded', expectedStatusLevel: 'success'},
                    {status: 'paid', expectedStatusLevel: 'success'},
                    {status: 'shipped', expectedStatusLevel: 'success'}
                ].forEach(function (order) {
                        it('expose status level as function', inject(function() {
                            expect(scope.statusLevel(order.status)).toEqual(order.expectedStatusLevel);
                        }));

                        describe('and order is found', function() {
                            beforeEach(function() {
                                request().success(order);
                            });

                            it('payload is exposed on scope as order', inject(function() {
                                expect(scope.order).toEqual(order);
                            }));

                            it('statusLevel is exposed on order', function () {
                                expect(scope.order.statusLevel).toEqual(order.expectedStatusLevel);
                            });
                        });
                    });
            });
        });
    });

    describe('purchase order addresses', function () {
        var address = {
            label: 'label',
            addressee: 'addressee'
        };

        describe('addressSelection', function () {
            var service;
            var registryMock;

            beforeEach(inject(function (localStorage, topicRegistry, topicRegistryMock) {
                registryMock = topicRegistryMock;
                service = LocalStorageAddressSelectionFactory(localStorage, topicRegistry);
            }));

            it('retrieves all selected addresses', function () {
                expect(service.all()).toEqual({});
            });

            describe('when adding', function () {
                describe('an address', function () {
                    it('it gets stored in local storage', inject(function (localStorage) {
                        service.add('type', address);

                        expect(localStorage.addresses).toEqual(JSON.stringify({type: address}))
                    }));
                });

                describe('an undefined address', function () {
                    it('an empty map gets stored in local storage', inject(function (localStorage) {
                        service.add('type', undefined);

                        expect(localStorage.addresses).toEqual(JSON.stringify({type: {}}));
                    }));
                });
            });

            describe('viewing', function () {
                describe('with address', function () {
                    beforeEach(inject(function () {
                        service.add('type', address);
                    }));

                    it('address can be retrieve from local storage', function () {
                        expect(service.view('type')).toEqual(address);
                    });
                });

                describe('without address', function () {
                    it('test', function () {
                        expect(service.view('type')).toEqual({});
                    });
                });
            });


            describe('clearing', function () {
                beforeEach(inject(function () {
                    service.add('type', address);
                    service.clear();
                }));

                it('test', inject(function (localStorage) {
                    expect(service.all()).toEqual({});
                    expect(localStorage.addresses).toEqual(JSON.stringify({}));
                }));
            });
        });

        describe('AddressSelectionController', function () {
            var addressSelection = jasmine.createSpyObj('addressSelection', ['add', 'view']);
            var viewCustomerAddress = jasmine.createSpy('viewCustomerAddress');

            beforeEach(inject(function ($controller) {
                ctrl = $controller(AddressSelectionController, {$scope: scope, addressSelection: addressSelection, $location: location, viewCustomerAddress: viewCustomerAddress});
                scope.type = address;
            }));

            describe('on init', function () {
                beforeEach(inject(function () {
                    addressSelection.view.andReturn({label: 'label'});
                }));

                describe('without type param in search', function () {
                    beforeEach(inject(function () {
                        scope.init('type');
                    }));

                    it('view from address selection', function () {
                        expect(addressSelection.view.mostRecentCall.args[0]).toEqual('type');
                        expect(scope.type.label).toEqual('label');
                    });
                });
                describe('with type param in search', function () {
                    beforeEach(inject(function () {
                        location.search({type: 'alt-label'});
                        scope.init('type');
                    }));

                    it('overwrites address label with route param', function () {
                        expect(scope.type.label).toEqual('alt-label');
                    });
                });
            });

            function assertSelectedAddress(type, address) {
                expect(addressSelection.add.mostRecentCall.args[0]).toEqual(type);
                expect(addressSelection.add.mostRecentCall.args[1]).toEqual(address);
            }

            describe('on select', function () {
                beforeEach(inject(function () {
                    scope.select('type');
                }));

                it('delegates to address selection', function () {
                    assertSelectedAddress('type', scope.type);
                });
            });

            [
                {fallbackAddressType: 'billing', addressTypeToFallbackWith: 'shipping'},
                {fallbackAddressType: 'shipping', addressTypeToFallbackWith: 'billing'}
            ].forEach(function (ctx) {
                    describe('a fallback to ' + ctx.fallbackAddressType + ' is set', function () {
                        beforeEach(function () {
                            scope.fallbackTo(ctx.fallbackAddressType);
                        });

                        describe('given a ' + ctx.fallbackAddressType + ' address selected', function () {
                            beforeEach(function () {
                                scope[ctx.fallbackAddressType] = 'selected-' + ctx.fallbackAddressType + '-address';
                            });

                            describe('given for ' + ctx.addressTypeToFallbackWith + ' addresses the same-as-' + ctx.fallbackAddressType + ' option is selected', function () {
                                beforeEach(function () {
                                    scope[ctx.addressTypeToFallbackWith] = {
                                        label: undefined,
                                        addressee: 'may-be-populated-from-local-storage'
                                    }
                                });

                                describe('on select ' + ctx.addressTypeToFallbackWith + ' address', function () {
                                    beforeEach(function () {
                                        scope.select(ctx.addressTypeToFallbackWith);
                                    });

                                    it('then fallback address is selected instead', function () {
                                        assertSelectedAddress(ctx.addressTypeToFallbackWith, scope[ctx.fallbackAddressType]);
                                    });
                                });
                            });

                            describe('given ' + ctx.addressTypeToFallbackWith + ' address is the same as ' + ctx.fallbackAddressType, function () {
                                beforeEach(function () {
                                    scope[ctx.addressTypeToFallbackWith] = scope[ctx.fallbackAddressType];
                                });

                                describe('on reset to same as fallback option', function () {
                                    beforeEach(function () {
                                        scope.resetIfSameAsFallback(ctx.addressTypeToFallbackWith);
                                    });

                                    it('then...', function () {
                                        expect(scope[ctx.addressTypeToFallbackWith]).toEqual({});
                                    });
                                });
                            });
                        });
                    });
                });

            describe('on view', function () {
                describe('with address in address selection', function () {
                    describe('with addressee', function () {
                        beforeEach(inject(function () {
                            addressSelection.view.andReturn({label: 'label', addressee: 'addressee'});
                            scope.view('type');
                        }));

                        it('view from address selection', function () {
                            expect(addressSelection.view.mostRecentCall.args[0]).toEqual('type');
                        });

                        it('passes label', function () {
                            expect(viewCustomerAddress.mostRecentCall.args[0]).toEqual({label: 'label'})
                        });

                        describe('on successfull view customer address', function () {
                            var payload = {label: 'label', addressee: 'alt-addressee'};
                            beforeEach(inject(function () {
                                viewCustomerAddress.mostRecentCall.args[1](payload);
                            }));

                            it('puts payload on scope as type', function () {
                                expect(scope.type).toEqual(payload);
                            });

                            it('puts selected address addressee on scope', function () {
                                expect(scope.type.addressee).toEqual('addressee');
                            });
                        });
                    });

                    describe('without addressee', function () {
                        beforeEach(inject(function () {
                            addressSelection.view.andReturn({label: 'label'});
                            scope.view('type');
                        }));

                        describe('on successfull view customer address', function () {
                            var payload = {label: 'label', addressee: 'alt-addressee'};
                            beforeEach(inject(function () {
                                viewCustomerAddress.mostRecentCall.args[1](payload);
                            }));

                            it('puts addressee from view on scope', function () {
                                expect(scope.type.addressee).toEqual('alt-addressee');
                            });
                        });
                    });

                });

                describe('without address in address selection', function () {
                    beforeEach(inject(function () {
                        addressSelection.view.andReturn(undefined);
                        viewCustomerAddress.reset();
                        scope.view('type');
                    }));

                    it('view customer address is not called', function () {
                        expect(viewCustomerAddress.calls[0]).toBeUndefined();
                    });
                });

            });
        });
    });

    describe('SelectPaymentProviderController', function () {
        var local;

        beforeEach(inject(function ($controller, localStorage) {
            $controller(SelectPaymentProviderController, {$scope: scope, config: config});
            local = localStorage;
        }));

        describe('given no payment provider', function () {
            beforeEach(function () {
                scope.provider = null;
                delete local['provider'];
            });

            describe('with a configured default provider', function () {
                beforeEach(function () {
                    config.defaultPaymentProvider = 'default-provider';
                });

                describe('on init', function () {
                    beforeEach(function () {
                        scope.init();
                    });

                    it('provider is set to default provider', function () {
                        expect(scope.provider).toEqual('default-provider');
                        expect(local.provider).toEqual('default-provider');
                    });
                });
            });

            describe('without a configured default provider', function () {
                beforeEach(function () {
                    config.defaultPaymentProvider = null;
                });

                describe('on init', function () {
                    beforeEach(function () {
                        scope.init();
                    });

                    it('provider is not set', function () {
                        expect(scope.provider).toBeUndefined();
                        expectKeyIsNotPresent(local, 'provider');
                    });

                    function expectKeyIsNotPresent(obj, key) {
                        expect(obj.hasOwnProperty(key)).toBeFalsy();
                    }
                });
            });
        });

        describe('given a remembered payment provider', function () {
            beforeEach(function () {
                local.provider = 'selected-provider';
            });

            describe('on init', function () {
                beforeEach(function () {
                    scope.init();
                });

                it('then remembered provider gets selected', function () {
                    expect(scope.provider).toEqual('selected-provider');
                });
            });

            describe('and a selected provider', function () {
                beforeEach(function () {
                    scope.provider = 'selected-provider';
                });

                describe('when selecting new provider', function () {
                    beforeEach(function () {
                        scope.provider = 'new-provider';
                        scope.flush();
                    });

                    it('the new provider gets stored in localstorage', function () {
                        expect(local.provider).toEqual('new-provider');
                    });
                });
            });


        });
    });

    describe('ApprovePaymentController', function () {
        beforeEach(inject(function ($controller) {
            ctrl = $controller(ApprovePaymentController, {$scope: scope, config: config});
        }));

        describe('given payment params', function () {
            beforeEach(inject(function ($routeParams) {
                $routeParams.id = 'payment-id';
                location.search('PayerID', 'transaction-id');
            }));

            [null, 'base-uri/'].forEach(function (baseUri) {
                describe('with base uri = ' + baseUri, function () {
                    beforeEach(function () {
                        config.baseUri = baseUri;
                    });

                    describe('on init', function () {
                        beforeEach(function () {
                            scope.init();
                        });

                        it('then context is created', function () {
                            expect(usecaseAdapter.mostRecentCall.args[0]).toEqual(scope);
                        });

                        it('then a POST request is configured', function () {
                            expect(presenter.params.method).toEqual('POST');
                        });

                        it('context is configured to pass along credentials', function () {
                            expect(presenter.params.withCredentials).toBeTruthy();
                        });

                        it('payer id is passed along as transaction', inject(function ($routeParams) {
                            expect(presenter.params.data).toEqual($routeParams);
                        }));

                        it('destination url takes route params id', function () {
                            expect(presenter.params.url).toEqual((baseUri || '') + 'api/purchase-order-payment/payment-id/approve')
                        });

                        it('context is passed to rest service handler', function () {
                            expect(rest.mostRecentCall.args[0]).toEqual(presenter);
                        });

                        [null, 'locale'].forEach(function (locale) {
                            describe('with locale = ' + locale, function () {
                                beforeEach(function () {
                                    scope.locale = locale;
                                });

                                describe('on success', function () {
                                    beforeEach(function () {
                                        presenter.success();
                                    });

                                    it('redirect to home', function () {
                                        expect(location.search().PayerID).toBeUndefined();
                                        expect(location.search().token).toBeUndefined();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('CancelPaymentController', function () {
        beforeEach(inject(function ($controller, $routeParams) {
            ctrl = $controller(CancelPaymentController, {$scope: scope, config: config});
            $routeParams.id = 'payment-id';
        }));

        describe('on init', function () {
            beforeEach(function () {
                scope.init();
            });

            it('creates context', function () {
                expect(usecaseAdapter.mostRecentCall.args[0]).toEqual(scope);
            });

            it('sets up the context for a rest call', inject(function ($routeParams) {
                expect(presenter.params.method).toEqual('POST');
                expect(presenter.params.url).toEqual('api/entity/purchase-order');
                expect(presenter.params.data).toEqual({
                    status: 'canceled',
                    context: 'updateStatusAsCustomer',
                    id: $routeParams.id,
                    treatInputAsId:true
                });
                expect(presenter.params.withCredentials).toBeTruthy();
            }));

            describe('with a configured base uri', function () {
                beforeEach(function () {
                    config.baseUri = 'base-uri/';
                    scope.init();
                });

                it('prefixes base uri', function () {
                    expect(presenter.params.url).toEqual('base-uri/api/entity/purchase-order');
                });
            });

            it('hands context to rest service', function () {
                expect(rest.mostRecentCall.args[0]).toEqual(presenter);
            });

            describe('on success', function () {
                beforeEach(function () {
                    location.search('token', 'payment-token');
                    presenter.success();
                });

                it('redirects to home page', function () {
                    expect(location.path()).toEqual('/');
                    expect(location.search().token).toBeUndefined();
                });

                it('fires a notification', inject(function (topicMessageDispatcherMock) {
                    expect(topicMessageDispatcherMock['system.info']).toEqual({
                        code: 'purchase.order.cancel.success',
                        default: 'Your purchase order was cancelled'
                    });
                }));
            });
            describe('on not found', function () {
                beforeEach(function () {
                    presenter.notFound();
                });

                it('redirect to 404 page', function () {
                    expect(location.path()).toEqual('/404')
                })
            });
        });

    });

    describe('UpdateOrderStatusController', function() {
        beforeEach(inject(function($controller, $routeParams) {
            config.baseUri = 'base-uri/';
            $routeParams.id = 'id';
            $routeParams.owner = 'owner';
            ctrl = $controller(UpdateOrderStatusController, {$scope:scope, config:config})
        }));

        [
            {status:'in-transit', func:function() {scope.inTransit()}},
            {status:'shipped', func:function() {scope.shipped()}},
            {status:'paid', func:function() {scope.paid()}},
            {status:'shipping-pending', func:function() {scope.shippingPending()}},
            {status:'canceled', func:function() {scope.cancel()}}
        ].forEach(function(def) {
            describe('on move to ' + def.status, function() {
                beforeEach(function() {
                    def.func();
                });

                it('request is sent', inject(function($routeParams) {
                    expect(request().params).toEqual({
                        method:'POST',
                        url: 'base-uri/api/entity/purchase-order',
                        data: {
                            context: 'updateStatusAsVendor',
                            id: $routeParams.id,
                            owner: $routeParams.owner,
                            status: def.status,
                            treatInputAsId:true
                        },
                        withCredentials:true
                    })
                }));

                describe('and success', function() {
                    beforeEach(inject(function() {
                        scope.order = {status:'previous'};
                        request().success();
                    }));

                    it('order status is updated', inject(function() {
                        expect(scope.order.status).toEqual(def.status);
                    }));

                    it('test', inject(function(topicMessageDispatcherMock) {
                        expect(topicMessageDispatcherMock['system.success']).toEqual({
                            code: 'purchase.order.update.status.success',
                            default: 'The status of the order has been updated'
                        })
                    }));
                });
            });
        });

        describe('pathStartsWith', function() {
            beforeEach(inject(function($location) {
                $location.path('/valid/path/');
            }));

            it('match full path', inject(function() {
                expect(scope.pathStartsWith('/valid/path/')).toBeTruthy();
            }));

            it('match start of path', inject(function() {
                expect(scope.pathStartsWith('/valid/')).toBeTruthy();
            }));

            it('do not match end of path', inject(function() {
                expect(scope.pathStartsWith('/path/')).toBeFalsy();
            }));

            it('do not match invalid path', inject(function() {
                expect(scope.pathStartsWith('invalid')).toBeFalsy();
            }));
        });
    });

    describe('ValidateOrder', function() {
        describe('when validating', function() {
            var args = {};
            var success = jasmine.createSpy('success');
            var error = jasmine.createSpy('error');

            beforeEach(inject(function(validateOrder) {
                args.data = {items:['I1', 'I2']};
                args.success = success;
                args.error = error;
                validateOrder(scope, args);
            }));

            it('send request', function() {
                expect(request().params).toEqual({
                    method: 'POST',
                    url: 'api/validate/purchase-order',
                    data: {
                        reportType: 'complex',
                        items: [
                            'I1', 'I2'
                        ]
                    },
                    withCredentials: true
                })
            });

            describe('on success', function() {
                beforeEach(function() {
                    request().success();
                });

                it('then callback is called', function() {
                    expect(success.calls[0]).toBeDefined();
                })
            });

            describe('on error', function() {
                beforeEach(function() {
                    request().error();
                });

                it('then callback is called', function() {
                    expect(error.calls[0]).toBeDefined();
                })
            });
        });
    });
});