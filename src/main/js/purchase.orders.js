angular.module('purchase.orders', [])
    .controller('ListPurchaseOrderController', ['$scope', 'usecaseAdapterFactory', 'restServiceHandler', 'config', ListPurchaseOrderController])
    .factory('addressSelection', ['localStorage', LocalStorageAddressSelectionFactory])
    .controller('AddressSelectionController', ['$scope', 'addressSelection', 'viewCustomerAddress', '$location', AddressSelectionController])
    .controller('SelectPaymentProviderController', ['$scope', 'localStorage', 'config', SelectPaymentProviderController])
    .controller('ApprovePaymentController', ['$scope', 'usecaseAdapterFactory', '$location', '$routeParams', 'restServiceHandler', 'config', ApprovePaymentController])
    .controller('CancelPaymentController', ['$scope', 'usecaseAdapterFactory', '$routeParams', 'config', 'restServiceHandler', '$location', 'topicMessageDispatcher', CancelPaymentController])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when('/payment/:id/approve', {templateUrl: 'partials/shop/approve-payment.html', controller: 'ApprovePaymentController'})
            .when('payment/:id/cancel', {templateUrl: 'partials/shop/cancel-payment.html', controller: 'CancelPaymentController'})
            .when('/:locale/payment/:id/approve', {templateUrl: 'partials/shop/approve-payment.html', controller: 'ApprovePaymentController'})
            .when('/:locale/payment/:id/cancel', {templateUrl: 'partials/shop/cancel-payment.html', controller: 'CancelPaymentController'})
    }]);

function ListPurchaseOrderController($scope, usecaseAdapterFactory, restServiceHandler, config) {
    $scope.init = function() {
        var baseUri = config.baseUri || '';
        var onSuccess = function(payload) {
            $scope.orders = payload;
        };
        var presenter = usecaseAdapterFactory($scope, onSuccess);
        presenter.params = {
            method:'POST',
            data: {
                args: {
                    dummy:'dummy'
                }
            },
            url:baseUri + 'api/query/purchase-order/findByPrincipal',
            withCredentials:true
        };
        restServiceHandler(presenter);
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

function CancelPaymentController($scope, usecaseAdapterFactory, $routeParams, config, restServiceHandler, $location, topicMessageDispatcher) {
    $scope.init = function() {
        var ctx = usecaseAdapterFactory($scope);
        ctx.params = {
            method: 'POST',
            url: (config.baseUri || '') + 'purchase-order-payment/' + $routeParams.id + '/cancel',
            withCredentials: true
        };
        ctx.success = function() {
            $location.search('token', null);
            $location.path(($scope.locale || '') + '/');
            topicMessageDispatcher.fire('system.info', {
                code: 'purchase.order.cancel.success',
                default: 'Your purchase order was cancelled'
            })
        };
        restServiceHandler(ctx);
    }
}