angular.module('purchase.orders', ['ngRoute', 'i18n'])
    .controller('ListPurchaseOrderController', ['$scope', 'config', 'fetchAccountMetadata', '$q', ListPurchaseOrderController])
    .controller('ViewPurchaseOrderController', ['$scope', 'usecaseAdapterFactory', 'restServiceHandler', 'config', '$routeParams', ViewPurchaseOrderController])
    .factory('addressSelection', ['localStorage', LocalStorageAddressSelectionFactory])
    .factory('validateOrder', ['usecaseAdapterFactory', 'restServiceHandler', 'config', ValidateOrderFactory])
    .controller('AddressSelectionController', ['$scope', 'addressSelection', 'viewCustomerAddress', '$location', AddressSelectionController])
    .controller('SelectPaymentProviderController', ['$scope', 'localStorage', 'config', SelectPaymentProviderController])
    .controller('ApprovePaymentController', ['$scope', 'usecaseAdapterFactory', '$location', '$routeParams', 'restServiceHandler', 'config', ApprovePaymentController])
    .controller('CancelPaymentController', ['$scope', 'usecaseAdapterFactory', '$routeParams', 'config', 'restServiceHandler', 'i18nLocation', 'topicMessageDispatcher', CancelPaymentController])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when('/payment/:id/approve', {templateUrl: 'partials/shop/approve-payment.html', controller: 'ApprovePaymentController'})
            .when('/payment/:id/cancel', {templateUrl: 'partials/shop/cancel-payment.html', controller: 'CancelPaymentController'})
            .when('/:locale/payment/:id/approve', {templateUrl: 'partials/shop/approve-payment.html', controller: 'ApprovePaymentController'})
            .when('/:locale/payment/:id/cancel', {templateUrl: 'partials/shop/cancel-payment.html', controller: 'CancelPaymentController'})
            .when('/order/:id', {templateUrl: 'partials/shop/order-details.html', controller: 'ViewPurchaseOrderController'})
            .when('/:locale/order/:id', {templateUrl: 'partials/shop/order-details.html', controller: 'ViewPurchaseOrderController'})
    }]);

function ListPurchaseOrderController($scope, config, fetchAccountMetadata, $q) {
    $scope.decorator = function(order) {
        mapStatusLevel(order, {bootstrapVersion:config.styling});
    };

    $scope.filtersCustomizer = function(args) {
        var deferred = $q.defer();
        fetchAccountMetadata({
            ok:function(it) {
                args.filters.owner = it.principal;
                deferred.resolve()
            },
            unauthorized: function() {
                deferred.resolve();
            }
        });
        return deferred.promise;
    };
}

function mapStatusLevel(order, args) {
    if(order.status) order.statusLevel = args.bootstrapVersion == 'bootstrap2'
        ? getStatusLevelForBootstrap2(order.status)
        : getStatusLevelForBootstrap3(order.status);
}

function getStatusLevelForBootstrap2(status) {
    switch (status) {
        case 'review-pending':
            return 'warning';
        case 'canceled':
            return 'important';
        case 'refunded':
            return 'success';
        case 'paid':
            return 'success';
        case 'shipped':
            return 'success';
        default:
            return 'info';
    }
}

function getStatusLevelForBootstrap3(status) {
    switch (status) {
        case 'review-pending':
            return 'warning';
        case 'canceled':
            return 'danger';
        case 'refunded':
            return 'success';
        case 'paid':
            return 'success';
        case 'shipped':
            return 'success';
        default:
            return 'info';
    }
}

function ViewPurchaseOrderController($scope, usecaseAdapterFactory, restServiceHandler, config, $routeParams) {
    var request = usecaseAdapterFactory($scope);
    var initConfig = {};

    $scope.init = function(args) {
        if (args) initConfig = args;
        prepareRestCall();
        restServiceHandler(request);
    };

    function prepareRestCall() {
        request.success = exposeOrderOnScope;
        request.params = {
            method: 'GET',
            params: {
                id: $routeParams.id,
                owner: $routeParams.owner,
                treatInputAsId: true
            },
            url: (config.baseUri || '') + 'api/entity/purchase-order',
            withCredentials: true
        };
    }

    function exposeOrderOnScope(payload) {
        mapStatusLevel(payload, {bootstrapVersion: config.styling});
        $scope.order = payload;
    }

    $scope.statusLevel = function(status) {
        var input = {status:status};
        mapStatusLevel(input, {bootstrapVersion:config.styling});
        return input.statusLevel;
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
            url: (config.baseUri || '') + 'api/purchase-order-payment/' + $routeParams.id + '/approve',
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
                id: $routeParams.id,
                treatInputAsId:true
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

function UpdateOrderStatusController($scope, usecaseAdapterFactory, config, $routeParams, restServiceHandler, topicMessageDispatcher, $location) {
    var request = usecaseAdapterFactory($scope);
    request.params = {
        method:'POST',
        url: (config.baseUri || '') + 'api/entity/purchase-order',
        data: {
            context: 'updateStatusAsVendor',
            id: $routeParams.id,
            owner: $routeParams.owner,
            treatInputAsId:true
        },
        withCredentials:true
    };

    $scope.inTransit = function() {
        updateToStatus('in-transit');
    };

    $scope.paid = function() {
        updateToStatus('paid');
    };

    $scope.shippingPending = function() {
        updateToStatus('shipping-pending');
    };

    $scope.cancel = function() {
        updateToStatus('canceled');
    };

    function updateToStatus(status) {
        request.params.data.status = status;
        request.success = function() {
            $scope.order.status = status;
            topicMessageDispatcher.fire('system.success', {
                code: 'purchase.order.update.status.success',
                default: 'The status of the order has been updated'
            })
        };
        restServiceHandler(request);
    }

    $scope.shipped = function() {
        updateToStatus('shipped');
    };

    $scope.pathStartsWith = function(path) {
        return $location.path().indexOf(path) == 0;
    }
}

function ValidateOrderFactory(usecaseAdapterFactory, restServiceHandler, config) {
    return function($scope, args) {
        var request = usecaseAdapterFactory($scope);
        request.success = args.success;
        request.error = args.error;
        args.data.reportType = 'complex';
        request.params = {
            method:'POST',
            url: (config.baseUri || '') + 'api/validate/purchase-order',
            data: args.data,
            withCredentials:true
        };
        restServiceHandler(request);
    }
}