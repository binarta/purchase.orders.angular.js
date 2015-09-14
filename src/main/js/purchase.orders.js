(function () {
    angular.module('purchase.orders', ['ngRoute', 'config', 'checkpoint', 'angular.usecase.adapter', 'rest.client', 'web.storage', 'customer.address', 'i18n', 'notifications'])
        .controller('ListPurchaseOrderController', ['$scope', 'config', 'fetchAccountMetadata', '$q', ListPurchaseOrderController])
        .controller('ViewPurchaseOrderController', ['$scope', 'usecaseAdapterFactory', 'restServiceHandler', 'config', '$routeParams', ViewPurchaseOrderController])
        .factory('addressSelection', ['localStorage', LocalStorageAddressSelectionFactory])
        .factory('validateOrder', ['usecaseAdapterFactory', 'restServiceHandler', 'config', ValidateOrderFactory])
        .controller('AddressSelectionController', ['$scope', 'addressSelection', 'viewCustomerAddress', '$location', '$routeParams', AddressSelectionController])
        .controller('SelectPaymentProviderController', ['$scope', 'localStorage', 'config', SelectPaymentProviderController])
        .controller('ApprovePaymentController', ['$scope', 'usecaseAdapterFactory', '$location', '$routeParams', 'restServiceHandler', 'config', ApprovePaymentController])
        .controller('CancelPaymentController', ['$scope', 'usecaseAdapterFactory', '$routeParams', 'config', 'restServiceHandler', 'i18nLocation', 'topicMessageDispatcher', CancelPaymentController])
        .controller('UpdateOrderStatusController', ['$scope', 'usecaseAdapterFactory', 'config', '$routeParams', 'restServiceHandler', 'topicMessageDispatcher', '$location', UpdateOrderStatusController])
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider
                .when('/payment/:id/approve', {
                    templateUrl: 'partials/shop/approve-payment.html',
                    controller: 'ApprovePaymentController'
                })
                .when('/payment/:id/cancel', {
                    templateUrl: 'partials/shop/cancel-payment.html',
                    controller: 'CancelPaymentController'
                })
                .when('/:locale/payment/:id/approve', {
                    templateUrl: 'partials/shop/approve-payment.html',
                    controller: 'ApprovePaymentController'
                })
                .when('/:locale/payment/:id/cancel', {
                    templateUrl: 'partials/shop/cancel-payment.html',
                    controller: 'CancelPaymentController'
                })
                .when('/order/:id', {
                    templateUrl: 'partials/shop/order-details.html',
                    controller: 'ViewPurchaseOrderController'
                })
                .when('/:locale/order/:id', {
                    templateUrl: 'partials/shop/order-details.html',
                    controller: 'ViewPurchaseOrderController'
                })
        }]);

    function ListPurchaseOrderController($scope, config, fetchAccountMetadata, $q) {
        $scope.decorator = function (order) {
            mapStatusLevel(order, {bootstrapVersion: config.styling});
        };

        $scope.filtersCustomizer = function (args) {
            var deferred = $q.defer();
            fetchAccountMetadata({
                ok: function (it) {
                    args.filters.owner = it.principal;
                    deferred.resolve()
                },
                unauthorized: function () {
                    deferred.resolve();
                }
            });
            return deferred.promise;
        };
    }

    function mapStatusLevel(order, args) {
        if (order.status) order.statusLevel = args.bootstrapVersion == 'bootstrap2'
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

        $scope.init = function (args) {
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

        $scope.statusLevel = function (status) {
            var input = {status: status};
            mapStatusLevel(input, {bootstrapVersion: config.styling});
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

        return new function () {
            if (!localStorage.addresses) {
                addresses = {};
                flush();
            }
            hydrate();
            this.all = function () {
                return addresses;
            };
            this.add = function (type, data) {
                if (data) addresses[type] = {label: data.label, addressee: data.addressee};
                else addresses[type] = {};
                flush();
            };
            this.view = function (type) {
                return addresses[type] || {};
            };
            this.clear = function () {
                addresses = {};
                flush();
            }
        };
    }

    function AddressSelectionController($scope, addressSelection, viewCustomerAddress, $location, $routeParams) {
        var self = this;
        var types = [];

        $scope.init = function (args) {
            init(args, $scope);
        };
        this.init = function (args) {
            init(args, self);
        };
        function init(args, ctx) {
            var type = args.type || args;
            types.push(type);

            var address = addressSelection.view(type);
            if (args.addresses) {
                if (args.addresses.length > 0) {
                    ctx[type] = address.label && isAddressKnown(address) ? address : angular.copy(args.addresses[0]);
                } else {
                    ctx[type] = undefined;
                }
            } else {
                ctx[type] = address;
            }

            if ($location.search()[type]) ctx[type].label = $location.search()[type];

            function isAddressKnown(address) {
                var known = false;
                angular.forEach(args.addresses, function (it) {
                    if (it.label == address.label) known = true;
                });
                return known;
            }
        }


        $scope.fallbackTo = fallbackTo;
        this.fallbackTo = fallbackTo;
        function fallbackTo(fallbackAddressType) {
            self.fallbackAddressType = fallbackAddressType;
        }

        $scope.resetIfSameAsFallback = function (type) {
            resetIfSameAsFallback(type, $scope);
        };
        this.resetIfSameAsFallback = function (type) {
            resetIfSameAsFallback(type, self);
        };
        function resetIfSameAsFallback(type, ctx) {
            if (ctx[type].label == ctx[self.fallbackAddressType].label)
                ctx[type] = {};
        }

        $scope.select = function (type) {
            select(type, $scope);
        };
        this.select = function (type) {
            select(type, self);
        };
        function select(type, ctx) {
            addressSelection.add(type, ctx[type].label ? ctx[type] : ctx[self.fallbackAddressType]);
        }

        $scope.view = function (type) {
            view(type, $scope);
        };
        this.view = function (type) {
            view(type, self);
        };
        function view(type, ctx) {
            var context = addressSelection.view(type);
            var onSuccess = function (payload) {
                ctx[type] = payload;
                if (context.addressee) ctx[type].addressee = context.addressee;
            };
            if (context) viewCustomerAddress({label: context.label}, onSuccess);
        }

        this.isValid = function () {
            var isValid = true;
            angular.forEach(types, function (type) {
                if (!self[type] || !self[type].label) isValid = false;
            });
            return isValid;
        };

        this.proceed = function (args) {
            if (self.isValid()) {
                angular.forEach(types, function (type) {
                    self.select(type);
                });
                if (args && args.redirectTo) $location.path(($routeParams.locale || '') + args.redirectTo);
            }
        }
    }

    function SelectPaymentProviderController($scope, localStorage, config) {
        $scope.init = function () {
            if (localStorage.provider == null && config.defaultPaymentProvider != null) {
                $scope.provider = config.defaultPaymentProvider;
                $scope.flush();
            } else {
                $scope.provider = localStorage.provider;
            }
        };

        $scope.select = function (provider) {
            $scope.provider = provider;
            $scope.flush();
        };

        $scope.flush = function () {
            localStorage.provider = $scope.provider;
        }
    }

    function ApprovePaymentController($scope, usecaseAdapterFactory, $location, $routeParams, restServiceHandler, config) {
        $scope.init = function () {
            var ctx = usecaseAdapterFactory($scope);
            ctx.params = {
                method: 'POST',
                url: (config.baseUri || '') + 'api/purchase-order-payment/' + $routeParams.id + '/approve',
                withCredentials: true,
                data: $routeParams

            };
            ctx.success = function () {
                $location.$$search = {};
            };
            restServiceHandler(ctx);
        }
    }

    function CancelPaymentController($scope, usecaseAdapterFactory, $routeParams, config, restServiceHandler, i18nLocation, topicMessageDispatcher) {
        $scope.init = function () {
            var ctx = usecaseAdapterFactory($scope);
            ctx.params = {
                method: 'POST',
                url: (config.baseUri || '') + 'api/entity/purchase-order',
                data: {
                    status: 'canceled',
                    context: 'updateStatusAsCustomer',
                    id: $routeParams.id,
                    treatInputAsId: true
                },
                withCredentials: true
            };
            ctx.success = function () {
                i18nLocation.search({});
                i18nLocation.path('/');
                topicMessageDispatcher.fire('system.info', {
                    code: 'purchase.order.cancel.success',
                    default: 'Your purchase order was cancelled'
                })
            };
            ctx.notFound = function () {
                i18nLocation.path('/404')
            };
            restServiceHandler(ctx);
        }
    }

    function UpdateOrderStatusController($scope, usecaseAdapterFactory, config, $routeParams, restServiceHandler, topicMessageDispatcher, $location) {
        var id, owner, successNotification;

        $scope.init = function (args) {
            id = args.id;
            owner = args.owner;
            successNotification = args.successNotification;
        };

        $scope.inTransit = function (args) {
            updateToStatus('in-transit', args);
        };

        $scope.paid = function (args) {
            updateToStatus('paid', args);
        };

        $scope.shippingPending = function (args) {
            updateToStatus('shipping-pending', args);
        };

        $scope.cancel = function (args) {
            updateToStatus('canceled', args);
        };

        function updateToStatus(status, args) {
            var request = usecaseAdapterFactory($scope);
            request.params = {
                method: 'POST',
                url: (config.baseUri || '') + 'api/entity/purchase-order',
                data: {
                    context: 'updateStatusAsVendor',
                    id: id || $routeParams.id,
                    owner: owner || $routeParams.owner,
                    treatInputAsId: true,
                    status: status
                },
                withCredentials: true
            };
            request.success = function () {
                $scope.order.status = status;
                if (args && args.success) args.success();
                if (successNotification != false)
                    topicMessageDispatcher.fire('system.success', {
                        code: 'purchase.order.update.status.success',
                        default: 'The status of the order has been updated'
                    });
            };
            restServiceHandler(request);
        }

        $scope.shipped = function (args) {
            updateToStatus('shipped', args);
        };

        $scope.pathStartsWith = function (path) {
            return $location.path().indexOf(path) == 0;
        }
    }

    function ValidateOrderFactory(usecaseAdapterFactory, restServiceHandler, config) {
        return function ($scope, args) {
            var request = usecaseAdapterFactory($scope);
            request.success = args.success;
            request.error = args.error;
            args.data.reportType = 'complex';
            request.params = {
                method: 'POST',
                url: (config.baseUri || '') + 'api/validate/purchase-order',
                data: args.data,
                withCredentials: true
            };
            restServiceHandler(request);
        }
    }
})();