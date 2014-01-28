angular.module('purchase.orders', [])
    .controller('ListPurchaseOrderController', ['$scope', 'usecaseAdapterFactory', 'restServiceHandler', 'config', ListPurchaseOrderController])
    .factory('addressSelection', ['localStorage', LocalStorageAddressSelectionFactory])
    .controller('AddressSelectionController', ['$scope', 'addressSelection', 'viewCustomerAddress', '$location', AddressSelectionController]);

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