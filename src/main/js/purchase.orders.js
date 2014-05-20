angular.module('purchase.orders', ['ngRoute', 'i18n'])
    .controller('ListPurchaseOrderController', ['$scope', 'usecaseAdapterFactory', 'restServiceHandler', 'config', 'fetchAccountMetadata', ListPurchaseOrderController])
    .controller('ViewPurchaseOrderController', ['$scope', 'usecaseAdapterFactory', 'restServiceHandler', 'config', '$routeParams', ViewPurchaseOrderController])
    .factory('addressSelection', ['localStorage', LocalStorageAddressSelectionFactory])
    .controller('AddressSelectionController', ['$scope', 'addressSelection', 'viewCustomerAddress', '$location', AddressSelectionController])
    .controller('SelectPaymentProviderController', ['$scope', 'localStorage', 'config', SelectPaymentProviderController])
    .controller('ApprovePaymentController', ['$scope', 'usecaseAdapterFactory', '$location', '$routeParams', 'restServiceHandler', 'config', ApprovePaymentController])
    .controller('CancelPaymentController', ['$scope', 'usecaseAdapterFactory', '$routeParams', 'config', 'restServiceHandler', 'i18nLocation', 'topicMessageDispatcher', CancelPaymentController])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when('/payment/:id/approve', {templateUrl: 'partials/shop/approve-payment.html', controller: 'ApprovePaymentController'})
            .when('payment/:id/cancel', {templateUrl: 'partials/shop/cancel-payment.html', controller: 'CancelPaymentController'})
            .when('/:locale/payment/:id/approve', {templateUrl: 'partials/shop/approve-payment.html', controller: 'ApprovePaymentController'})
            .when('/:locale/payment/:id/cancel', {templateUrl: 'partials/shop/cancel-payment.html', controller: 'CancelPaymentController'})
            .when('/order/:id', {templateUrl: 'partials/shop/order-details.html', controller: 'ViewPurchaseOrderController'})
    }]);

function ListPurchaseOrderController($scope, usecaseAdapterFactory, restServiceHandler, config, fetchAccountMetadata) {
    var request = usecaseAdapterFactory($scope);
    var defaultSubset = {offset:0, count: 10};
    $scope.orders = [];

    $scope.search = function() {
        reset();
        sendRequest();
    };

    function reset() {
        $scope.orders = [];
        request.params.data.args.subset.offset = 0;
        request.params.data.args.owner = $scope.owner;
    }

    function sendRequest() {
        restServiceHandler(request);
    }

    $scope.init = function(args) {
        new Initializer(args || {}).execute();
    };

    $scope.searchForMore = sendRequest;

    function Initializer(args) {
        this.execute = function() {
            overrideSubset();
            prepareRestQuery();
            args.useCurrentUser ? useCurrentUser() : sendRequest();
        };

        function useCurrentUser() {
            fetchAccountMetadata({
                ok:function(it) {
                    request.params.data.args.owner = it.principal;
                    sendRequest();
                },
                unauthorized: sendRequest
            });
        }

        function overrideSubset() {
            if (args.subset) {
                defaultSubset.offset = args.subset.offset;
                defaultSubset.count = args.subset.count;
            }
        }

        function prepareRestQuery() {
            request.params = {
                method:'POST',
                data: {
                    args: {
                        subset: {offset:defaultSubset.offset, count: defaultSubset.count},
                        sortings: args.sortings || []
                    }
                },
                url:(config.baseUri || '') + 'api/query/purchase-order/findAll',
                withCredentials:true
            };
            request.success = exposeResults;
        }

        function exposeResults(payload) {
            incrementOffsetWith(payload.length);
            payload.forEach(addOrderToScope);
        }

        function addOrderToScope(order) {
            $scope.orders.push(order);
        }

        function incrementOffsetWith(size) {
            request.params.data.args.subset.offset += size;
        }
    }
}

function ViewPurchaseOrderController($scope, usecaseAdapterFactory, restServiceHandler, config, $routeParams) {
    var request = usecaseAdapterFactory($scope);

    $scope.init = function() {
        prepareRestCall();
        restServiceHandler(request);
    };

    function prepareRestCall() {
        request.success = exposeOrderOnScope;
        request.params = {
            method: 'GET',
            params: {
                id: $routeParams.id,
                treatInputAsId: true
            },
            url: (config.baseUri || '') + 'api/entity/purchase-order',
            withCredentials: true
        };
    }

    function exposeOrderOnScope(payload) {
        $scope.order = payload;
    }
}

function LocalStorageAddressSelectionFactory(localStorage) {
    var addresses;

    function flush() {
        localStorage.addresses = JSON.stringify(addresses);
    }

    function hydrate() {
        addresses = JSON.parse(localStorage.addresses);
    }

    return new function() {
        if (!localStorage.addresses) {
            addresses = {};
            flush();
        }
        hydrate();
        this.all = function() {
            return addresses;
        };
        this.add = function(type, data) {
            if (data) addresses[type] = {label: data.label, addressee: data.addressee};
            else addresses[type] = {};
            flush();
        };
        this.view = function(type) {
            return addresses[type] || {};
        };
        this.clear = function() {
            addresses = {};
            flush();
        }
    };
}

function AddressSelectionController($scope, addressSelection, viewCustomerAddress, $location) {
    var self = this;

    $scope.init = function(type) {
        $scope[type] = addressSelection.view(type);
        if ($location.search()[type]) $scope[type].label = $location.search()[type];
    };

    $scope.fallbackTo = function(fallbackAddressType) {
        self.fallbackAddressType = fallbackAddressType;
    };

    $scope.resetIfSameAsFallback = function(type) {
        if($scope[type].label == $scope[self.fallbackAddressType].label)
            $scope[type] = {};
    };

    $scope.select = function(type) {
        addressSelection.add(type, $scope[type].label ? $scope[type] : $scope[self.fallbackAddressType]);
    };

    $scope.view = function(type) {
        var ctx = addressSelection.view(type);
        var onSuccess = function(payload) {
            $scope[type] = payload;
            if (ctx.addressee) $scope[type].addressee = ctx.addressee;
        };
        if (ctx) viewCustomerAddress({label: ctx.label}, onSuccess);
    }
}

function SelectPaymentProviderController($scope, localStorage, config) {
    $scope.init = function() {
        if (localStorage.provider == null && config.defaultPaymentProvider != null) {
            $scope.provider = config.defaultPaymentProvider;
            $scope.flush();
        } else {
            $scope.provider = localStorage.provider;
        }
    };

    $scope.select = function(provider) {
        $scope.provider = provider;
        $scope.flush();
    };

    $scope.flush = function() {
        localStorage.provider = $scope.provider;
    }
}

function ApprovePaymentController($scope, usecaseAdapterFactory, $location, $routeParams, restServiceHandler, config) {
    $scope.init = function() {
        var ctx = usecaseAdapterFactory($scope);
        ctx.params = {
            method: 'POST',
            url: (config.baseUri || '') + 'purchase-order-payment/' + $routeParams.id + '/approve',
            withCredentials: true,
            data: $routeParams

        };
        ctx.success = function() {
            $location.$$search = {};
        };
        restServiceHandler(ctx);
    }
}

function CancelPaymentController($scope, usecaseAdapterFactory, $routeParams, config, restServiceHandler, i18nLocation, topicMessageDispatcher) {
    $scope.init = function() {
        var ctx = usecaseAdapterFactory($scope);
        ctx.params = {
            method: 'POST',
            url: (config.baseUri || '') + 'api/entity/purchase-order',
            data: {
                status: 'canceled',
                context: 'updateStatusAsCustomer',
                id: {
                    id: $routeParams.id
                }
            },
            withCredentials: true
        };
        ctx.success = function() {
            i18nLocation.search({});
            i18nLocation.path('/');
            topicMessageDispatcher.fire('system.info', {
                code: 'purchase.order.cancel.success',
                default: 'Your purchase order was cancelled'
            })
        };
        ctx.notFound = function() {
            i18nLocation.path('/404')
        };
        restServiceHandler(ctx);
    }
}