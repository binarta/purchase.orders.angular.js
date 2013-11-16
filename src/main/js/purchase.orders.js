angular.module('purchase.orders', [])
    .controller('ListPurchaseOrderController', ['$scope', 'usecaseAdapterFactory', 'restServiceHandler', 'config', ListPurchaseOrderController]);

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