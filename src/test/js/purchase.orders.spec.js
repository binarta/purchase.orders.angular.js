describe('purchase.orders.angular', function () {
    var $window;
    var ctrl;
    var scope;
    var usecaseAdapter;
    var presenter = {};
    var rest;
    var config = {};
    var location;
    var routeParams;
    var self = this;
    var fetchAccountMetadata = function (it) {
        if (authorized) it.ok(accountMetadata);
        else it.unauthorized();
    };
    var authorized = true;
    var accountMetadata = {principal: 'principal'};

    beforeEach(module('purchase.orders'));
    beforeEach(module('angular.usecase.adapter'));
    beforeEach(module('rest.client'));
    beforeEach(module('web.storage'));
    beforeEach(module('config'));
    beforeEach(module('notifications'));
    beforeEach(inject(function ($rootScope, usecaseAdapterFactory, restServiceHandler, $location, topicMessageDispatcherMock, $routeParams) {
        $window = {location:undefined};
        scope = $rootScope.$new();
        usecaseAdapter = usecaseAdapterFactory;
        usecaseAdapter.and.callFake(function() { return presenter; });
        rest = restServiceHandler;
        location = $location;
        routeParams = $routeParams;
        self.topicMessageDispatcherMock = topicMessageDispatcherMock;
    }));

    afterEach(function () {
        config = {};
        presenter = {};
    });

    function request(idx) {
        if(!idx) idx = 0;
        return rest.calls.argsFor(idx)[0];
    }

    describe('toPurchaseOrderStatusLevel filter', function () {
        var config, filter;

        beforeEach(inject(function (_config_, toPurchaseOrderStatusLevelFilter) {
            config = _config_;
            filter = toPurchaseOrderStatusLevelFilter;
        }));

        describe('with default styling', function () {
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
            ].forEach(function (input) {
                    it('status "' + input.status + '" should return "' + input.statusLevel + '"', function () {
                        expect(filter(input.status)).toEqual(input.statusLevel);
                    });
                });
        });

        describe('with bootstrap2 styling', function () {
            beforeEach(function () {
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
            ].forEach(function (input) {
                    it('status "' + input.status + '" should return "' + input.statusLevel + '"', function () {
                        expect(filter(input.status)).toEqual(input.statusLevel);
                    });
                });
        });
    });

    describe('ListPurchaseOrdersController', function () {
        beforeEach(inject(function ($controller) {
            authorized = true;
            ctrl = $controller('ListPurchaseOrderController', {
                $scope: scope,
                config: config,
                fetchAccountMetadata: fetchAccountMetadata
            });
        }));

        describe('on decorator', function () {
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
            ].forEach(function (input) {
                    it('test', function () {
                        var order = {status: input.status};
                        scope.decorator(order);
                        expect(order.statusLevel).toEqual(input.statusLevel);
                    })
                });

            describe('for bootstrap2', function () {
                beforeEach(function () {
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
                ].forEach(function (input) {
                        it('test', function () {
                            var order = {status: input.status};
                            scope.decorator(order);
                            expect(order.statusLevel).toEqual(input.statusLevel);
                        })
                    })
            });

        });

        describe('on filters customizer', function () {
            var filters;
            var promiseWasResolved;

            beforeEach(function () {
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

            it('when authenticated expose principal on filters', function () {
                filter();
                expect(filters.owner).toEqual(accountMetadata.principal);
                assertPromiseWasResolved();
            });

            it('when unauthenticated nothing is exposed on filters', function () {
                authorized = false;
                filter();
                expect(filters.owner).toBeUndefined();
                assertPromiseWasResolved();
            })
        });
    });

    describe('ViewPurchaseOrderController', function () {
        beforeEach(inject(function ($controller) {
            ctrl = $controller('ViewPurchaseOrderController', {$scope: scope, config: config});
            config.baseUri = 'base-uri/';
        }));

        describe('using scope', function () {
            describe('on init with route params', function () {
                beforeEach(inject(function ($routeParams) {
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
                        it('expose status level as function', inject(function () {
                            expect(scope.statusLevel(order.status)).toEqual(order.expectedStatusLevel);
                        }));

                        describe('and order is found', function () {
                            beforeEach(function () {
                                request().success(order);
                            });

                            it('payload is exposed on scope as order', inject(function () {
                                expect(scope.order).toEqual(order);
                            }));

                            it('statusLevel is exposed on order', function () {
                                expect(scope.order.statusLevel).toEqual(order.expectedStatusLevel);
                            });
                        });
                    });

                describe('when bootstrap 2', function () {
                    beforeEach(inject(function ($routeParams) {
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
                            it('expose status level as function', inject(function () {
                                expect(scope.statusLevel(order.status)).toEqual(order.expectedStatusLevel);
                            }));

                            describe('and order is found', function () {
                                beforeEach(function () {
                                    request().success(order);
                                });

                                it('payload is exposed on scope as order', inject(function () {
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

        describe('using controller', function () {
            describe('on init with route params', function () {
                beforeEach(inject(function ($routeParams) {
                    $routeParams.id = 'id';
                    $routeParams.owner = 'owner';
                    ctrl.init();
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

                describe('and order is found', function () {
                    beforeEach(function () {
                        request().success('order');
                    });

                    it('payload is exposed on controller as order', inject(function () {
                        expect(ctrl.order).toEqual('order');
                    }));
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

            beforeEach(inject(function (addressSelection) {
                service = addressSelection;
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
                ctrl = $controller('AddressSelectionController', {
                    $scope: scope,
                    addressSelection: addressSelection,
                    $location: location,
                    viewCustomerAddress: viewCustomerAddress,
                    $routeParams: routeParams
                });
            }));

            [
                'scope',
                'controller'
            ].forEach(function (c) {
                    describe('with ' + c, function () {
                        var context;

                        beforeEach(function () {
                            context = (c == 'scope') ? scope : ctrl;
                            context.type = address;
                        });

                        describe('on init', function () {
                            describe('and addressSelection has value', function () {
                                beforeEach(inject(function () {
                                    addressSelection.view.and.callFake(function() { return {label: 'label'}; });
                                }));

                                describe('without type param in search', function () {
                                    beforeEach(inject(function () {
                                        context.init('type');
                                    }));

                                    it('view from address selection', function () {
                                        expect(addressSelection.view.calls.mostRecent().args[0]).toEqual('type');
                                        expect(context.type.label).toEqual('label');
                                    });
                                });
                                describe('with type param in search', function () {
                                    beforeEach(inject(function () {
                                        location.search({type: 'alt-label'});
                                        context.init('type');
                                    }));

                                    it('overwrites address label with route param', function () {
                                        expect(context.type.label).toEqual('alt-label');
                                    });
                                });

                                describe('accepts also a hash', function () {
                                    describe('without type param in search', function () {
                                        beforeEach(inject(function () {
                                            context.init({type: 'type'});
                                        }));

                                        it('view from address selection', function () {
                                            expect(addressSelection.view.calls.mostRecent().args[0]).toEqual('type');
                                            expect(context.type.label).toEqual('label');
                                        });
                                    });
                                    describe('with type param in search', function () {
                                        beforeEach(inject(function () {
                                            location.search({type: 'alt-label'});
                                            context.init({type: 'type'});
                                        }));

                                        it('overwrites address label with route param', function () {
                                            expect(context.type.label).toEqual('alt-label');
                                        });
                                    });
                                });
                            });

                            describe('when addresses are passed', function () {
                                var addresses = [{
                                    label: 'label1'
                                }, {
                                    label: 'label2'
                                }];

                                describe('and addressSelection has value', function () {
                                    beforeEach(inject(function () {
                                        addressSelection.view.and.callFake(function() { return {label: 'label2'}; });
                                    }));

                                    it('select address', function () {
                                        context.init({type: 'type', addresses: addresses});

                                        expect(context.type.label).toEqual('label2');
                                    });
                                });

                                describe('and addressSelection has no value', function () {
                                    beforeEach(inject(function () {
                                        addressSelection.view.and.callFake(function() { return {}; });
                                    }));

                                    it('copy first from known addresses', function () {
                                        context.init({type: 'type', addresses: addresses});

                                        expect(context.type.label).toEqual('label1');
                                        expect(context.type).not.toBe(addresses[0]);
                                    });
                                });

                                describe('and addressSelection has unknown value', function () {
                                    beforeEach(inject(function () {
                                        addressSelection.view.and.callFake(function() { return {label: 'unknown'}; });
                                    }));

                                    it('select first from known addresses', function () {
                                        context.init({type: 'type', addresses: addresses});

                                        expect(context.type.label).toEqual('label1');
                                    });
                                });

                                describe('and addresses are empty', function () {
                                    beforeEach(inject(function () {
                                        addresses = [];
                                        addressSelection.view.and.callFake(function() { return {label: 'unknown'}; });
                                    }));
                                
                                    it('nothing to select', function () {
                                        context.init({type: 'type', addresses: addresses});
                                
                                        expect(context.type).toBeUndefined();
                                    });
                                });

                            });

                        });

                        function assertSelectedAddress(type, address) {
                            expect(addressSelection.add.calls.mostRecent().args[0]).toEqual(type);
                            expect(addressSelection.add.calls.mostRecent().args[1]).toEqual(address);
                        }

                        describe('on select', function () {
                            beforeEach(inject(function () {
                                context.select('type');
                            }));

                            it('delegates to address selection', function () {
                                assertSelectedAddress('type', context.type);
                            });
                        });

                        [
                            {fallbackAddressType: 'billing', addressTypeToFallbackWith: 'shipping'},
                            {fallbackAddressType: 'shipping', addressTypeToFallbackWith: 'billing'}
                        ].forEach(function (ctx) {
                                describe('a fallback to ' + ctx.fallbackAddressType + ' is set', function () {
                                    beforeEach(function () {
                                        context.fallbackTo(ctx.fallbackAddressType);
                                    });

                                    describe('given a ' + ctx.fallbackAddressType + ' address selected', function () {
                                        beforeEach(function () {
                                            context[ctx.fallbackAddressType] = 'selected-' + ctx.fallbackAddressType + '-address';
                                        });

                                        describe('given for ' + ctx.addressTypeToFallbackWith + ' addresses the same-as-' + ctx.fallbackAddressType + ' option is selected', function () {
                                            beforeEach(function () {
                                                context[ctx.addressTypeToFallbackWith] = {
                                                    label: undefined,
                                                    addressee: 'may-be-populated-from-local-storage'
                                                }
                                            });

                                            describe('on select ' + ctx.addressTypeToFallbackWith + ' address', function () {
                                                beforeEach(function () {
                                                    context.select(ctx.addressTypeToFallbackWith);
                                                });

                                                it('then fallback address is selected instead', function () {
                                                    assertSelectedAddress(ctx.addressTypeToFallbackWith, context[ctx.fallbackAddressType]);
                                                });
                                            });
                                        });

                                        describe('given ' + ctx.addressTypeToFallbackWith + ' address is the same as ' + ctx.fallbackAddressType, function () {
                                            beforeEach(function () {
                                                context[ctx.addressTypeToFallbackWith] = context[ctx.fallbackAddressType];
                                            });

                                            describe('on reset to same as fallback option', function () {
                                                beforeEach(function () {
                                                    context.resetIfSameAsFallback(ctx.addressTypeToFallbackWith);
                                                });

                                                it('then...', function () {
                                                    expect(context[ctx.addressTypeToFallbackWith]).toEqual({});
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
                                        addressSelection.view.and.callFake(function() { return {label: 'label', addressee: 'addressee'}; });
                                        context.view('type');
                                    }));

                                    it('view from address selection', function () {
                                        expect(addressSelection.view.calls.mostRecent().args[0]).toEqual('type');
                                    });

                                    it('passes label', function () {
                                        expect(viewCustomerAddress.calls.mostRecent().args[0]).toEqual({label: 'label'})
                                    });

                                    describe('on successfull view customer address', function () {
                                        var payload = {label: 'label', addressee: 'alt-addressee'};
                                        beforeEach(inject(function () {
                                            viewCustomerAddress.calls.mostRecent().args[1](payload);
                                        }));

                                        it('puts payload on scope as type', function () {
                                            expect(context.type).toEqual(payload);
                                        });

                                        it('puts selected address addressee on scope', function () {
                                            expect(context.type.addressee).toEqual('addressee');
                                        });
                                    });
                                });

                                describe('without addressee', function () {
                                    beforeEach(inject(function () {
                                        addressSelection.view.and.callFake(function() { return {label: 'label'}; });
                                        context.view('type');
                                    }));

                                    describe('on successfull view customer address', function () {
                                        var payload = {label: 'label', addressee: 'alt-addressee'};
                                        beforeEach(inject(function () {
                                            viewCustomerAddress.calls.mostRecent().args[1](payload);
                                        }));

                                        it('puts addressee from view on context', function () {
                                            expect(context.type.addressee).toEqual('alt-addressee');
                                        });
                                    });
                                });

                            });

                            describe('without address in address selection', function () {
                                beforeEach(inject(function () {
                                    addressSelection.view.and.callFake(function() { return undefined; });
                                    viewCustomerAddress.calls.reset();
                                    context.view('type');
                                }));

                                it('view customer address is not called', function () {
                                    expect(viewCustomerAddress.calls.argsFor(0)[0]).toBeUndefined();
                                });
                            });

                        });
                    });
                });


            describe('on isValid', function () {
                describe('and address types are known', function () {
                    beforeEach(function () {
                        addressSelection.view.and.callFake(function() { return {label: 'label1'}; });
                        ctrl.init({type: 'label1'});
                        addressSelection.view.and.callFake(function() { return {label: 'label2'}; });
                        ctrl.init({type: 'label2'});
                    });

                    it('is valid', function () {
                        expect(ctrl.isValid()).toBeTruthy();
                    });
                });

                describe('and not all address types are known', function () {
                    beforeEach(function () {
                        addressSelection.view.and.callFake(function() { return {label: 'label1'}; });
                        ctrl.init({type: 'label1'});
                        addressSelection.view.and.callFake(function() { return {}; });
                        ctrl.init({type: 'label2'});
                    });

                    it('is not valid', function () {
                        expect(ctrl.isValid()).toBeFalsy();
                    });
                });
            });

            describe('on proceed', function () {
                describe('and state is invalid', function () {
                    beforeEach(function () {
                        addressSelection.add.calls.reset();
                        addressSelection.view.and.callFake(function() { return {}; });
                        ctrl.init({type: 'label'});
                    });

                    it('do nothing', function () {
                        ctrl.proceed();

                        expect(addressSelection.add).not.toHaveBeenCalled();
                    });
                });

                describe('and state is valid', function () {
                    beforeEach(function () {
                        addressSelection.add.calls.reset();
                        addressSelection.view.and.callFake(function() { return {label: 'label'}; });
                        ctrl.init({type: 'label'});
                    });

                    it('address is selected', function () {
                        ctrl.proceed();

                        expect(addressSelection.add.calls.mostRecent().args[0]).toEqual('label');
                    });

                    describe('with redirectTo', function () {
                        it('without locale', function () {
                            ctrl.proceed({redirectTo: '/path'});

                            expect(location.path()).toEqual('/path');
                        });

                        it('with locale', function () {
                            routeParams.locale = 'locale';

                            ctrl.proceed({redirectTo: '/path'});

                            expect(location.path()).toEqual('/locale/path');
                        });
                    });
                });
            });
        });
    });

    describe('SelectPaymentProviderController', function () {
        var local;

        beforeEach(inject(function ($controller, localStorage) {
            $controller('SelectPaymentProviderController', {$scope: scope, config: config});
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
            ctrl = $controller('ApprovePaymentController', {$scope: scope, config: config});
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
                            expect(usecaseAdapter.calls.mostRecent().args[0]).toEqual(scope);
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
                            expect(rest.calls.mostRecent().args[0]).toEqual(presenter);
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
            ctrl = $controller('CancelPaymentController', {$scope: scope, config: config});
            $routeParams.id = 'payment-id';
        }));

        describe('on init', function () {
            beforeEach(function () {
                scope.init();
            });

            it('creates context', function () {
                expect(usecaseAdapter.calls.mostRecent().args[0]).toEqual(scope);
            });

            it('sets up the context for a rest call', inject(function ($routeParams) {
                expect(presenter.params.method).toEqual('POST');
                expect(presenter.params.url).toEqual('api/entity/purchase-order');
                expect(presenter.params.data).toEqual({
                    status: 'canceled',
                    context: 'updateStatusAsCustomer',
                    id: $routeParams.id,
                    treatInputAsId: true
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
                expect(rest.calls.mostRecent().args[0]).toEqual(presenter);
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

    describe('UpdateOrderStatusController', function () {
        var $routeParams;

        beforeEach(inject(function ($controller, _$routeParams_) {
            $routeParams = _$routeParams_;
            config.baseUri = 'base-uri/';
            ctrl = $controller('UpdateOrderStatusController', {$scope: scope, config: config});
        }));

        function assertStatusUpdate(args) {
            [
                {
                    status: 'in-transit', func: function () {
                    args ? scope.inTransit(args) : scope.inTransit();
                }
                },
                {
                    status: 'shipped', func: function () {
                    args ? scope.shipped(args) : scope.shipped();
                }
                },
                {
                    status: 'paid', func: function () {
                    args ? scope.paid(args) : scope.paid();
                }
                },
                {
                    status: 'shipping-pending', func: function () {
                    args ? scope.shippingPending(args) : scope.shippingPending();
                }
                },
                {
                    status: 'canceled', func: function () {
                    args ? scope.cancel(args) : scope.cancel();
                }
                }
            ].forEach(function (def) {
                    describe('on move to ' + def.status, function () {
                        beforeEach(function () {
                            def.func();
                            if (args) args.success.calls.reset();
                        });

                        it('request is sent', inject(function ($routeParams) {
                            expect(request().params).toEqual({
                                method: 'POST',
                                url: 'base-uri/api/entity/purchase-order',
                                data: {
                                    context: 'updateStatusAsVendor',
                                    id: 'id',
                                    owner: 'owner',
                                    status: def.status,
                                    treatInputAsId: true
                                },
                                withCredentials: true
                            })
                        }));

                        describe('and success', function () {
                            beforeEach(inject(function () {
                                scope.order = {status: 'previous'};
                                request().success();
                            }));

                            it('order status is updated', inject(function () {
                                expect(scope.order.status).toEqual(def.status);
                            }));

                            it('test', inject(function (topicMessageDispatcherMock) {
                                expect(topicMessageDispatcherMock['system.success']).toEqual({
                                    code: 'purchase.order.update.status.success',
                                    default: 'The status of the order has been updated'
                                })
                            }));

                            if (args) {
                                it('whit success callback', function () {
                                    expect(args.success).toHaveBeenCalled();
                                });
                            }
                        });
                    });
                });
        }

        describe('with routeParams', function () {
            beforeEach(function () {
                $routeParams.id = 'id';
                $routeParams.owner = 'owner';
            });

            assertStatusUpdate();
        });

        describe('with init', function () {
            beforeEach(function () {
                scope.init({
                    id: 'id',
                    owner: 'owner'
                });
            });

            assertStatusUpdate();
        });

        describe('with success callback defined', function () {
            beforeEach(function () {
                scope.init({
                    id: 'id',
                    owner: 'owner'
                });
            });

            assertStatusUpdate({success: jasmine.createSpy('success callback')});
        });

        describe('with init and notification is disabled', function () {
            beforeEach(function () {
                scope.init({
                    id: 'id',
                    owner: 'owner',
                    successNotification: false
                });
            });

            it('do not send notification', inject(function (topicMessageDispatcherMock) {
                scope.paid();
                scope.order = {status: 'previous'};
                request().success();

                expect(topicMessageDispatcherMock['system.success']).toBeUndefined();
            }));
        });

        describe('pathStartsWith', function () {
            beforeEach(inject(function ($location) {
                $location.path('/valid/path/');
            }));

            it('match full path', inject(function () {
                expect(scope.pathStartsWith('/valid/path/')).toBeTruthy();
            }));

            it('match start of path', inject(function () {
                expect(scope.pathStartsWith('/valid/')).toBeTruthy();
            }));

            it('do not match end of path', inject(function () {
                expect(scope.pathStartsWith('/path/')).toBeFalsy();
            }));

            it('do not match invalid path', inject(function () {
                expect(scope.pathStartsWith('invalid')).toBeFalsy();
            }));
        });
    });

    describe('purchaseOrderStatus directive', function () {
        var $rootScope, element, html, $compile, renderer, permitter, scope, topics;

        beforeEach(inject(function (_$rootScope_, _$compile_, editModeRenderer, activeUserHasPermission, topicMessageDispatcherMock) {
            $rootScope = _$rootScope_;
            $compile = _$compile_;
            renderer = editModeRenderer;
            permitter = activeUserHasPermission;
            topics = topicMessageDispatcherMock;

            $rootScope.order = {
                status: 'status',
                statusLevel: 'level'
            }
        }));

        function createElement() {
            html = '<purchase-order-status order="order"></purchase-order-status>';
            element = angular.element(html);
            $compile(element)($rootScope.$new());
            scope = element.isolateScope();
        }

        it('directive uses UpdateOrderStatusController', function () {
            createElement();

            expect(element.controller('purchaseOrderStatus').constructor.name).toEqual('UpdateOrderStatusController');
        });

        it('order is on scope', function () {
            $rootScope.order = 'order';

            createElement();

            expect(scope.order).toEqual('order');
        });

        it('template is compiled', function () {
            createElement();

            expect(element.html()).toContain('code="purchase.orders.status.status"');
        });

        it('check for permission', function () {
            createElement();

            expect(permitter).toHaveBeenCalled();
            expect(permitter.calls.argsFor(0)[1]).toEqual('update.purchase.order.as.vendor');
        });

        [
            {
                order: {
                    provider: 'wire-transfer',
                    status: 'pending-approval-by-customer'
                },
                expected: jasmine.any(Function)
            },
            {
                order: {
                    provider: 'provider',
                    status: 'pending-approval-by-customer'
                },
                expected: undefined
            },
            {
                order: {
                    provider: 'provider',
                    status: 'paid'
                },
                expected: jasmine.any(Function)
            },
            {
                order: {
                    provider: 'provider',
                    status: 'shipping-pending'
                },
                expected: jasmine.any(Function)
            },
            {
                order: {
                    provider: 'provider',
                    status: 'shipped'
                },
                expected: jasmine.any(Function)
            }
        ].forEach(function (test) {
                describe('order with provider: ' + test.order.provider + ' and status: ' + test.order.status, function () {
                    beforeEach(function () {
                        $rootScope.order = test.order;
                        createElement();
                    });

                    describe('when permitted', function () {
                        beforeEach(function () {
                            permitter.calls.argsFor(0)[0].yes();
                        });

                        it('clerk template is compiled', function () {
                            expect(element.html()).toContain('code="purchase.orders.status.' + test.order.status + '"');
                            if (test.expected) expect(element.html()).toContain('button');
                            else expect(element.html()).toContain('label');
                        });

                        it('has update on scope', function () {
                            expect(scope.update).toEqual(test.expected);
                        });
                    });
                });
            });

        describe('on update', function () {
            beforeEach(function () {
                $rootScope.order = {
                    provider: 'wire-transfer',
                    status: 'pending-approval-by-customer',
                    id: 'id',
                    owner: 'owner'
                };
                createElement();
                permitter.calls.argsFor(0)[0].yes();

                scope.update();
            });

            it('editModeRenderer is opened', function () {
                expect(renderer.open).toHaveBeenCalledWith({
                    template: jasmine.any(String),
                    scope: jasmine.any(Object)
                });
            });

            describe('with renderer scope', function () {
                var rendererScope;

                beforeEach(function () {
                    rendererScope = renderer.open.calls.argsFor(0)[0].scope;
                });

                function assertRequest(status) {
                    expect(request().params).toEqual({
                        method: 'POST',
                        url: 'api/entity/purchase-order',
                        data: {
                            context: 'updateStatusAsVendor',
                            id: 'id',
                            owner: 'owner',
                            status: status,
                            treatInputAsId: true
                        },
                        withCredentials: true
                    });

                    onRequestSuccess(status);
                }

                function onRequestSuccess(status) {
                    request().success();
                    assertDoNotShowSuccessNotification();
                    assertRendererIsClosed();
                    assertTemplateIsRecompiled(status);
                }

                function assertDoNotShowSuccessNotification() {
                    expect(topics['system.success']).toBeUndefined();
                }

                function assertRendererIsClosed() {
                    expect(renderer.close).toHaveBeenCalled();
                }

                function assertTemplateIsRecompiled(status) {
                    expect(element.html()).toContain('code="purchase.orders.status.' + status + '"');
                }

                it('order is available', function () {
                    expect(rendererScope.order).toEqual($rootScope.order);
                });

                it('on close', function () {
                    rendererScope.close();

                    expect(renderer.close).toHaveBeenCalled();
                });

                describe('on cancel order', function () {
                    beforeEach(function () {
                        rendererScope.cancelOrder();
                    });

                    it('ask confirmation', function () {
                        expect(rendererScope.cancelOrderConfirmation).toBeTruthy();
                    });

                    it('when aborted', function () {
                        rendererScope.cancelOrderAborted();

                        expect(rendererScope.cancelOrderConfirmation).toBeFalsy();
                    });

                    it('when confirmed', function () {
                        rendererScope.cancelOrderConfirmed();

                        assertRequest('canceled');
                    });
                });

                it('on paid', function () {
                    rendererScope.paid();

                    assertRequest('paid');
                });

                it('on shipping pending', function () {
                    rendererScope.shippingPending();

                    assertRequest('shipping-pending');
                });

                it('on shipped', function () {
                    rendererScope.shipped();

                    assertRequest('shipped');
                });
            });
        });

    });

    describe('ValidateOrder', function () {
        describe('when validating', function () {
            var args = {};
            var success = jasmine.createSpy('success');
            var error = jasmine.createSpy('error');

            beforeEach(inject(function (validateOrder) {
                args.data = {items: ['I1', 'I2']};
                args.success = success;
                args.error = error;
                validateOrder(scope, args);
            }));

            it('send request', function () {
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

            describe('on success', function () {
                beforeEach(function () {
                    request().success();
                });

                it('then callback is called', function () {
                    expect(success.calls.count()).toEqual(1);
                })
            });

            describe('on error', function () {
                beforeEach(function () {
                    request().error();
                });

                it('then callback is called', function () {
                    expect(error.calls.count()).toEqual(1);
                })
            });
        });
    });

    describe('PayPalGateway', function() {
        var paypal;
        var response;

        beforeEach(inject(['paypal', function(p) {
            response = jasmine.createSpyObj('response', ['rejected', 'success']);
            paypal = p;
        }]));

        describe('confirm permission request', function() {
            beforeEach(function() {
                paypal.confirmPermissionRequest({request_token:'request-token', verification_code:'verification-code'}, response);
            });

            it('executes webservice call', function() {
                expect(request().params.method).toEqual('POST');
                expect(request().params.url).toEqual('api/usecase');
                expect(request().params.withCredentials).toEqual(true);
                expect(request().params.data).toEqual({
                    headers:{usecase:'payment.provider.mandate.confirmation'},
                    payload:{
                        paymentProvider:'paypal-classic',
                        request_token:'request-token',
                        verification_code:'verification-code'
                    }
                });
            });

            it('wired success handler', function() {
                request().success();
                expect(response.success.calls.count()).toEqual(1);
            });

            it('wired rejected handler', function() {
                request().rejected('violations');
                expect(response.rejected.calls.argsFor(0)).toEqual(['violations']);
            });
        });
    });

    describe('SetupPaypalFSM', function() {
        var fsm;

        beforeEach(inject(function(setupPaypalFSM) {
            fsm = setupPaypalFSM;
            fsm.ui = jasmine.createSpyObj('ui', ['confirmPermissionRequest']);
        }));

        it('starts out in idle state', function() {
            expect(fsm.status.name).toEqual('idle');
        });

        describe('check for existing configuration', function() {
            var configLookup;

            beforeEach(function() {
                fsm.status.refresh();
            });
            beforeEach(inject(function(configReader) {
                expect(configReader.calls.count()).toEqual(1);
                configLookup = configReader.calls.mostRecent();
            }));

            it('looked up payment provider config', function() {
                expect(configLookup.args[0].scope).toEqual('system');
                expect(configLookup.args[0].key).toEqual('payment.provider');
            });

            it('then fsm is in working state', function() {
                expect(fsm.status.name).toEqual('working');
            });

            describe('and nothing found', function() {
                beforeEach(function() {
                    configLookup.args[0].notFound();
                });

                it('then fsm is in awaiting configuration state', function() {
                    expect(fsm.status.name).toEqual('awaiting-configuration');
                });

                describe('when we set the subject', function() {
                    beforeEach(function() {
                        fsm.status.subject = 'subject';
                        fsm.status.submit();
                    });

                    it('then fsm is in working state', function() {
                        expect(fsm.status.name).toEqual('working');
                    });

                    it('then sends set.paypal.subject web service call', function() {
                        expect(request().params.method).toEqual('POST');
                        expect(request().params.url).toEqual('api/usecase');
                        expect(request().params.withCredentials).toEqual(true);
                        expect(request().params.data).toEqual({
                            headers:{usecase:'set.paypal.subject'},
                            payload:{subject:'subject'}
                        });
                    });

                    describe('and subject is rejected', function() {
                        beforeEach(function() {
                            request().rejected('violations');
                        });

                        it('then fsm returns to awaiting configuration state', function() {
                            expect(fsm.status.name).toEqual('awaiting-configuration');
                        });

                        it('then the violation report is exposed on the status', function() {
                            expect(fsm.status.violations).toEqual('violations');
                        });

                        it('then the subject is preserved', function() {
                            expect(fsm.status.subject).toEqual('subject');
                        });
                    });

                    describe('and subject is accepted', function() {
                        beforeEach(function() {
                            request().success();
                        });

                        it('then fsm is in working state', function() {
                            expect(fsm.status.name).toEqual('working');
                        });

                        it('then sends enable.payment.integration web service call', function() {
                            expect(request(1).params.method).toEqual('POST');
                            expect(request(1).params.url).toEqual('api/usecase');
                            expect(request(1).params.withCredentials).toEqual(true);
                            expect(request(1).params.data).toEqual({
                                headers:{usecase:'enable.payment.integration'},
                                payload:{paymentProvider:'paypal-classic'}
                            });
                        });

                        describe('and integration flow started', function() {
                            beforeEach(function() {
                                request(1).success('confirmation-params');
                            });

                            it('then fsm is in confirm permission request state', function() {
                                expect(fsm.status.name).toEqual('confirm-permission-request');
                            });

                            it('then the user is asked to confirm the permission request', function() {
                                expect(fsm.ui.confirmPermissionRequest.calls.count()).toEqual(1);
                                expect(fsm.ui.confirmPermissionRequest.calls.argsFor(0)[0]).toEqual('confirmation-params');
                            });
                        });

                        describe('and request rejected', function() {
                            var violations;

                            beforeEach(function() {
                                violations = {
                                    mandate:[
                                        {
                                            code:520002,
                                            params:{},
                                            description:'Internal Error',
                                            level:'ERROR',
                                            label:null
                                        }
                                    ]
                                };
                                request(1).rejected(violations);
                            });

                            it('then fsm returns to awaiting configuration state', function() {
                                expect(fsm.status.name).toEqual('awaiting-configuration');
                            });

                            it('then state exposes subject', function() {
                                expect(fsm.status.subject).toEqual('subject');
                            });

                            it('then expose violations on status', function() {
                                expect(fsm.status.violations).toEqual(violations);
                            });
                        });
                    });
                });
            });

            describe('and subject found', function() {
                beforeEach(function() {
                    configLookup.args[0].success({value:JSON.stringify({credentials: {"acct1.Subject":"vendor@example.org"}})});
                });

                it('then fsm is in awaiting permission state', function() {
                    expect(fsm.status.name).toEqual('awaiting-permission');
                });

                it('then state exposes subject', function() {
                    expect(fsm.status.subject).toEqual('vendor@example.org');
                });

                describe('when requesting permission', function() {
                    beforeEach(function() {
                        fsm.status.submit();
                    });

                    it('then fsm is in working state', function() {
                        expect(fsm.status.name).toEqual('working');
                    });

                    it('then sends enable.payment.integration web service call', function() {
                        expect(request().params.method).toEqual('POST');
                        expect(request().params.url).toEqual('api/usecase');
                        expect(request().params.withCredentials).toEqual(true);
                        expect(request().params.data).toEqual({
                            headers:{usecase:'enable.payment.integration'},
                            payload:{paymentProvider:'paypal-classic'}
                        });
                    });

                    describe('and request rejected', function() {
                        var violations;

                        beforeEach(function() {
                            violations = {
                                mandate:[
                                    {
                                        code:520002,
                                        params:{},
                                        description:'Internal Error',
                                        level:'ERROR',
                                        label:null
                                    }
                                ]
                            };
                            request().rejected(violations);
                        });

                        it('then fsm returns to awaiting permission state', function() {
                            expect(fsm.status.name).toEqual('awaiting-permission');
                        });

                        it('then state exposes subject', function() {
                            expect(fsm.status.subject).toEqual('vendor@example.org');
                        });

                        it('then expose violations on status', function() {
                            expect(fsm.status.violations).toEqual(violations);
                        });
                    })
                });
            });

            describe('and credentials found', function() {
                beforeEach(function() {
                    configLookup.args[0].success({value:JSON.stringify({credentials: {
                        "acct1.Subject":"vendor@example.org",
                        "accessToken":"access-token",
                        "secretToken":"secret-token"
                    }})});
                });

                it('then fsm is in configured state', function() {
                    expect(fsm.status.name).toEqual('configured');
                });

                it('then state exposes subject', function() {
                    expect(fsm.status.subject).toEqual('vendor@example.org');
                });

                describe('when requesting permission', function() {
                    beforeEach(function() {
                        fsm.status.submit();
                    });

                    it('then fsm is in working state', function() {
                        expect(fsm.status.name).toEqual('working');
                    });

                    it('then sends enable.payment.integration web service call', function() {
                        expect(request().params.method).toEqual('POST');
                        expect(request().params.url).toEqual('api/usecase');
                        expect(request().params.withCredentials).toEqual(true);
                        expect(request().params.data).toEqual({
                            headers:{usecase:'enable.payment.integration'},
                            payload:{paymentProvider:'paypal-classic'}
                        });
                    });

                    describe('and request rejected', function() {
                        var violations;

                        beforeEach(function() {
                            violations = {
                                mandate:[
                                    {
                                        code:520002,
                                        params:{},
                                        description:'Internal Error',
                                        level:'ERROR',
                                        label:null
                                    }
                                ]
                            };
                            request().rejected(violations);
                        });

                        it('then fsm returns to configured state', function() {
                            expect(fsm.status.name).toEqual('configured');
                        });

                        it('then state exposes subject', function() {
                            expect(fsm.status.subject).toEqual('vendor@example.org');
                        });

                        it('then expose violations on status', function() {
                            expect(fsm.status.violations).toEqual(violations);
                        });
                    })
                });

                describe('when resetting paypal account', function() {
                    beforeEach(function() {
                        fsm.status.reset();
                    });

                    it('then fsm is in awaiting configuration state', function() {
                        expect(fsm.status.name).toEqual('awaiting-configuration');
                    });

                    it('then state exposes subject', function() {
                        expect(fsm.status.subject).toEqual('vendor@example.org');
                    });
                });

                describe('when disabling paypal integration', function() {
                    beforeEach(function() {
                        fsm.status.disable();
                    });

                    it('then fsm is in working state', function() {
                        expect(fsm.status.name).toEqual('working');
                    });

                    it('then sends disable.payment.integration web service call', function() {
                        expect(request().params.method).toEqual('POST');
                        expect(request().params.url).toEqual('api/usecase');
                        expect(request().params.withCredentials).toEqual(true);
                        expect(request().params.data).toEqual({
                            headers:{usecase:'disable.payment.integration'},
                            payload:{paymentProvider:'paypal-classic'}
                        });
                    });

                    describe('and request rejected', function() {
                        beforeEach(function() {
                            request().rejected('violations');
                        });

                        it('then fsm returns to configured state', function() {
                            expect(fsm.status.name).toEqual('configured');
                        });

                        it('then state exposes subject', function() {
                            expect(fsm.status.subject).toEqual('vendor@example.org');
                        });

                        it('then expose violations on status', function() {
                            expect(fsm.status.violations).toEqual('violations');
                        });
                    });

                    describe('and request accepted', function() {
                        beforeEach(function() {
                            request().success();
                        });

                        it('then fsm is in awaiting configuration state', function() {
                            expect(fsm.status.name).toEqual('awaiting-configuration');
                        });
                    })
                })
            });
        });
    });

    describe('SetupPaypalController', function() {
        beforeEach(inject(function ($controller) {
            ctrl = $controller('SetupPaypalController', {$window:$window, $scope: scope});
        }));

        it('exposes fsm', inject(function(setupPaypalFSM) {
            expect(ctrl.fsm).toEqual(setupPaypalFSM);
        }));

        it('connects with the fsm', function() {
            expect(ctrl.fsm.ui).toEqual(ctrl);
        });

        it('confirm permission request redirects the user', function() {
            ctrl.confirmPermissionRequest({confirmRequestUrl:'url'});
            expect($window.location).toEqual('url');
        });
    });
});