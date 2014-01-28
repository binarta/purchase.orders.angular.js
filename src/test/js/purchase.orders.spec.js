describe('purchase.orders.angular', function () {
    var ctrl;
    var scope;
    var usecaseAdapter;
    var presenter = {};
    var rest;
    var config = {};
    var location;

    beforeEach(module('purchase.orders'));
    beforeEach(module('angular.usecase.adapter'));
    beforeEach(module('rest.client'));
    beforeEach(module('web.storage'));
    beforeEach(module('notifications'));
    beforeEach(inject(function ($rootScope, usecaseAdapterFactory, restServiceHandler, $location) {
        scope = $rootScope.$new();
        usecaseAdapter = usecaseAdapterFactory;
        usecaseAdapter.andReturn(presenter);
        rest = restServiceHandler;
        location = $location;
    }));

    describe('ListPurchaseOrdersController', function () {
        beforeEach(inject(function ($controller) {
            ctrl = $controller(ListPurchaseOrderController, {$scope: scope, config: config});
        }));

        describe('on init', function () {
            [
                {baseUri: 'base-uri/', text: 'with base uri'},
                {baseUri: null, text: 'without base uri'}
            ].forEach(function (spec) {
                    describe(spec.text, function () {
                        beforeEach(function () {
                            config.baseUri = spec.baseUri;
                            scope.init();
                        });

                        it('presenter is created', function () {
                            expect(usecaseAdapter.calls[0].args[0]).toEqual(scope);
                        });

                        it('params are populated', function () {
                            expect(presenter.params.method).toEqual('POST');
                            expect(presenter.params.data).toEqual({args: {dummy: 'dummy'}});
                            expect(presenter.params.url).toEqual((spec.baseUri || '') + 'api/query/purchase-order/findByPrincipal');
                            expect(presenter.params.withCredentials).toBeTruthy();
                        });

                        it('rest service is called with presenter', function () {
                            expect(rest.calls[0].args[0]).toEqual(presenter);
                        });

                        it('on success payload is put on scope', function () {
                            var payload = [
                                {id: '1'},
                                {id: '2'}
                            ];
                            usecaseAdapter.calls[0].args[1](payload);

                            expect(scope.orders).toEqual(payload);
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

                            describe('given ' + ctx.addressTypeToFallbackWith + ' address is the same as ' + ctx.fallbackAddressType, function() {
                                beforeEach(function() {
                                    scope[ctx.addressTypeToFallbackWith] = scope[ctx.fallbackAddressType];
                                });

                                describe('on reset to same as fallback option', function() {
                                    beforeEach(function() {
                                        scope.resetIfSameAsFallback(ctx.addressTypeToFallbackWith);
                                    });

                                    it('then...', function() {
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


});