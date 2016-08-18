(function () {
    angular.module('purchase.orders', ['ngRoute', 'config', 'checkpoint', 'angular.usecase.adapter', 'rest.client', 'web.storage', 'customer.address', 'i18n', 'notifications', 'toggle.edit.mode'])
        .controller('ListPurchaseOrderController', ['$scope', 'config', 'fetchAccountMetadata', '$q', ListPurchaseOrderController])
        .controller('ViewPurchaseOrderController', ['$scope', 'usecaseAdapterFactory', 'restServiceHandler', 'config', '$routeParams', ViewPurchaseOrderController])
        .factory('addressSelection', ['localStorage', LocalStorageAddressSelectionFactory])
        .factory('validateOrder', ['usecaseAdapterFactory', 'restServiceHandler', 'config', ValidateOrderFactory])
        .service('paypal', ['config', 'configReader', 'restServiceHandler', PayPalGateway])
        .service('setupPaypalFSM', ['paypal', SetupPaypalFSM])
        .controller('AddressSelectionController', ['$scope', 'addressSelection', 'viewCustomerAddress', '$location', '$routeParams', AddressSelectionController])
        .controller('SelectPaymentProviderController', ['$scope', 'localStorage', 'config', SelectPaymentProviderController])
        .controller('ApprovePaymentController', ['$scope', '$location', 'i18nLocation', '$routeParams', '$log', ApprovePaymentController])
        .controller('CancelPaymentController', ['$scope', 'i18nLocation', '$log', CancelPaymentController])
        .controller('UpdateOrderStatusController', ['$scope', 'usecaseAdapterFactory', 'config', '$routeParams', 'restServiceHandler', 'topicMessageDispatcher', '$location', UpdateOrderStatusController])
        .controller('SetupPaypalController', ['$window', '$scope', 'setupPaypalFSM', SetupPaypalController])
        .controller('ConfirmPaypalPermissionsController', ['$scope', '$location', 'usecaseAdapterFactory', 'paypal', ConfirmPaypalPermissionsController])
        .directive('purchaseOrderStatus', ['$compile', '$filter', 'activeUserHasPermission', 'editModeRenderer', PurchaseOrderStatusDirective])
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
                    controller: 'ViewPurchaseOrderController as viewOrderCtrl'
                })
                .when('/:locale/order/:id', {
                    templateUrl: 'partials/shop/order-details.html',
                    controller: 'ViewPurchaseOrderController as viewOrderCtrl'
                })
                .when('/payment-provider/paypal-classic/request-mandate/approve', {
                    templateUrl: 'partials/shop/payment-provider-permission-approved.html',
                    controller: 'ConfirmPaypalPermissionsController'
                })
                .when('/:locale/payment-provider/paypal-classic/request-mandate/approve', {
                    templateUrl: 'partials/shop/payment-provider-permission-approved.html',
                    controller: 'ConfirmPaypalPermissionsController'
                })
        }]).filter('toPurchaseOrderStatusLevel', ['config', function (config) {
        return function (status) {
            return config.styling == 'bootstrap2'
                ? getStatusLevelForBootstrap2(status)
                : getStatusLevelForBootstrap3(status);
        }
    }]);

    function PayPalGateway(config, configReader, rest) {
        this.getConfig = function (response) {
            configReader({
                $scope: {}, // TODO - shame this is required here
                scope: 'system',
                key: 'payment.provider',
                success: response.success,
                notFound: function () {
                    response.success();
                }
            });
        };

        this.setSubject = function (params, response) {
            rest({
                params: {
                    method: 'POST',
                    data: {
                        headers: {usecase: 'set.paypal.subject'},
                        payload: {subject: params.subject}
                    },
                    url: (config.baseUri || '') + 'api/usecase',
                    withCredentials: true
                },
                success: response.success,
                rejected: response.rejected
            });
        };

        this.enablePaymentIntegration = function (response) {
            rest({
                params: {
                    method: 'POST',
                    data: {
                        headers: {usecase: 'enable.payment.integration'},
                        payload: {paymentProvider: 'paypal-classic'}
                    },
                    url: (config.baseUri || '') + 'api/usecase',
                    withCredentials: true
                },
                success: response.success,
                rejected: response.rejected
            });
        };

        this.disablePaymentIntegration = function (response) {
            rest({
                params: {
                    method: 'POST',
                    data: {
                        headers: {usecase: 'disable.payment.integration'},
                        payload: {paymentProvider: 'paypal-classic'}
                    },
                    url: (config.baseUri || '') + 'api/usecase',
                    withCredentials: true
                },
                success: response.success,
                rejected: response.rejected
            });
        };

        this.confirmPermissionRequest = function (params, response) {
            rest({
                params: {
                    method: 'POST',
                    data: {
                        headers: {usecase: 'payment.provider.mandate.confirmation'},
                        payload: {
                            paymentProvider: 'paypal-classic',
                            request_token: params.request_token,
                            verification_code: params.verification_code
                        }
                    },
                    url: (config.baseUri || '') + 'api/usecase',
                    withCredentials: true
                },
                success: response.success,
                rejected: response.rejected
            });
        }
    }

    function SetupPaypalFSM(paypal) {
        this.status = new InitialState(this);

        function InitialState(fsm) {
            this.name = 'idle';

            this.refresh = function () {
                fsm.status = new Working(fsm, function () {
                    paypal.getConfig({
                        success: function (json) {
                            var data = json ? JSON.parse(json.value) : undefined;
                            if (data && data.credentials && data.credentials['acct1.Subject'])
                                fsm.status = new Configured(fsm, data.credentials['acct1.Subject']);
                            else
                                fsm.status = new AwaitingConfiguration(fsm);
                        }
                    });
                });
            }
        }

        function Working(fsm, job) {
            this.name = 'working';
            job();
        }

        function Configured(fsm, subject) {
            var self = this;

            this.name = 'configured';
            this.subject = subject;

            this.submit = function () {
                fsm.status = new AwaitingConfiguration(fsm, this.subject);
                fsm.status.submit();
            };

            this.reset = function () {
                fsm.status = new AwaitingConfiguration(fsm, this.subject);
            };

            this.disable = function () {
                fsm.status = new Working(fsm, function () {
                    paypal.disablePaymentIntegration({
                        success: function (params) {
                            fsm.status = new AwaitingConfiguration(fsm);
                        },
                        rejected: function (violations) {
                            fsm.status = new Configured(fsm, self.subject);
                            fsm.status.violations = violations;
                        }
                    });
                });
            }
        }

        function AwaitingConfiguration(fsm, subject) {
            var self = this;
            if (subject) this.subject = subject;

            this.name = 'awaiting-configuration';

            this.submit = function () {
                fsm.status = new Working(fsm, function () {
                    paypal.setSubject(self, {
                        success: function () {
                            fsm.status = new Configured(fsm, self.subject);
                        },
                        rejected: OnRejection
                    });
                });
            };

            function OnRejection(violations) {
                fsm.status = new AwaitingConfiguration(fsm);
                fsm.status.violations = violations;
                fsm.status.subject = self.subject;
            }
        }
    }

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
        var self = this;
        var request = usecaseAdapterFactory($scope);
        var initConfig = {};

        $scope.init = function (args) {
            if (args) initConfig = args;
            prepareRestCall();
            restServiceHandler(request);
        };
        this.init = $scope.init;

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
            self.order = payload;
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

    function ApprovePaymentController($scope, $location, i18nLocation, $routeParams, $log) {
        $scope.init = function () {
            $log.warn('@deprecated ApprovePaymentController - modify backend to go directly to /checkout/payment');
            $location.search('id', $routeParams.id);
            i18nLocation.path('/checkout/payment');
        }
    }

    function CancelPaymentController($scope, i18nLocation, $log) {
        $scope.init = function () {
            $log.warn('@deprecated CancelPaymentController - modify backend to go directly to /checkout/payment');
            i18nLocation.url('/checkout/payment');
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

    function SetupPaypalController($window, $scope, fsm) {
        this.fsm = fsm;
        this.fsm.ui = this;

        this.confirmPermissionRequest = function (params) {
            $window.location = params.confirmRequestUrl;
        }
    }

    function ConfirmPaypalPermissionsController($scope, $location, adapter, paypal) {
        $scope.init = function () {
            var keys = Object.keys($location.search());
            if (keys.length) {
                var ctx = adapter($scope);
                keys.forEach(function (it) {
                    ctx[it] = $location.search()[it];
                });
                ctx.success = function () {
                    $scope.status = 'approved';
                    //$location.search({}); // TODO - do we really need to do this?
                };
                ctx.rejected = function () {
                    $scope.status = 'canceled';
                };
                paypal.confirmPermissionRequest(ctx, ctx);
            } else
                $scope.status = 'canceled';
        }
    }

    function PurchaseOrderStatusDirective($compile, $filter, permitter, renderer) {
        return {
            restrict: 'E',
            scope: {
                order: '='
            },
            controller: 'UpdateOrderStatusController',
            link: function (scope, el) {
                compileTemplate();

                permitter({
                    yes: function () {
                        if (isAllowedToUpdateStatus()) {
                            scope.update = update;
                            compileClerkTemplate();
                        }
                    }
                }, 'update.purchase.order.as.vendor');

                function isAllowedToUpdateStatus() {
                    if (scope.order.provider == 'wire-transfer' && scope.order.status == 'pending-approval-by-customer') return true;
                    if ([
                            'paid',
                            'shipping-pending',
                            'shipped'
                        ].indexOf(scope.order.status) != -1) return true;
                }

                function compileClerkTemplate() {
                    el.html('<button class="btn btn-sm btn-' + $filter('toPurchaseOrderStatusLevel')(scope.order.status) + '" ng-click="update()" ' +
                        'i18n code="purchase.orders.status.' + scope.order.status + '" read-only>' +
                        '<i class="fa fa-pencil fa-fw"></i> {{::var}}' +
                        '</button>');
                    $compile(el.contents())(scope);
                }

                function compileTemplate() {
                    el.html('<span class="label label-' + $filter('toPurchaseOrderStatusLevel')(scope.order.status) + '" ' +
                        'i18n code="purchase.orders.status.' + scope.order.status + '" read-only>{{::var}}</span>');
                    $compile(el.contents())(scope);
                }

                function update() {
                    scope.init({
                        id: scope.order.id,
                        owner: scope.order.owner,
                        successNotification: false
                    });

                    var rendererScope = angular.extend(scope.$new(), {
                        close: function () {
                            renderer.close();
                        },
                        cancelOrder: function () {
                            rendererScope.cancelOrderConfirmation = true;
                        },
                        cancelOrderAborted: function () {
                            rendererScope.cancelOrderConfirmation = false;
                        },
                        cancelOrderConfirmed: function () {
                            scope.cancel({
                                success: onSuccess
                            });
                        },
                        paid: function () {
                            scope.paid({
                                success: onSuccess
                            });
                        },
                        shippingPending: function () {
                            scope.shippingPending({
                                success: onSuccess
                            });
                        },
                        shipped: function () {
                            scope.shipped({
                                success: onSuccess
                            });
                        },
                        order: scope.order
                    });

                    function onSuccess() {
                        compileClerkTemplate();
                        renderer.close();
                    }

                    renderer.open({
                        template: '<form class="bin-menu-edit-body bin-menu-edit-purchase-orders">' +

                        '<div ng-show="working" i18n code="clerk.menu.updating.message" read-only>' +
                        '<i class="fa fa-spinner fa-spin fa-fw"></i> {{::var}}' +
                        '</div>' +

                        '<div ng-show="cancelOrderConfirmation && !working">' +
                        '<div class="row">' +
                        '<div class="col-xs-12">' +
                        '<div class="alert alert-danger" i18n code="purchase.orders.cancel.order.confirmation.message" read-only>' +
                        '<i class="fa fa-exclamation-circle fa-fw"></i> {{::var}}' +
                        '</div>' +
                        '</div>' +
                        '</div>' +

                        '<div class="row">' +
                        '<div class="col-xs-12">' +
                        '<button class="btn btn-danger" ng-click="cancelOrderConfirmed()" ng-disabled="working" ' +
                        'i18n code="purchase.orders.cancel.order.button" read-only>{{::var}}</button>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +

                        '<div ng-hide="cancelOrderConfirmation || working">' +
                        '<ol>' +
                        '<li ng-if="order.provider == \'wire-transfer\'" ' +
                        'style="margin-bottom: 30px;" ng-class="{\'active\': order.status == \'pending-approval-by-customer\'}">' +
                        '<button class="btn" ng-class="order.status == \'pending-approval-by-customer\' ? \'btn-success\' : \'btn-default\'" ' +
                        'style="padding: 15px;" disabled ' +
                        'i18n code="purchase.orders.status.pending-approval-by-customer" read-only>' +
                        '<i class="fa fa-clock-o fa-fw"></i> {{::var}}' +
                        '</button>' +
                        '</li>' +

                        '<li style="margin-bottom: 30px;" ng-class="{\'active\': order.status == \'paid\'}">' +
                        '<button class="btn" ng-class="order.status == \'paid\' ? \'btn-success\' : \'btn-default\'" ' +
                        'style="padding: 15px;" ng-click="paid()" ng-disabled="working || order.status == \'paid\'" ' +
                        'i18n code="purchase.orders.status.paid" read-only>' +
                        '<i class="fa fa-money fa-fw"></i> {{::var}}' +
                        '</button>' +
                        '</li>' +

                        '<li style="margin-bottom: 30px;" ng-class="{\'active\': order.status == \'shipping-pending\'}">' +
                        '<button class="btn" ng-class="order.status == \'shipping-pending\' ? \'btn-success\' : \'btn-default\'" ' +
                        'style="padding: 15px;" ng-click="shippingPending()" ' +
                        'ng-disabled="working || order.status == \'shipping-pending\' || order.status == \'pending-approval-by-customer\'" ' +
                        'i18n code="purchase.orders.status.shipping-pending" read-only>' +
                        '<i class="fa fa-calendar-check-o fa-fw"></i> {{::var}}' +
                        '</button>' +
                        '</li>' +

                        '<li style="margin-bottom: 30px;" ng-class="{\'active\': order.status == \'shipped\'}">' +
                        '<button class="btn" ng-class="order.status == \'shipped\' ? \'btn-success\' : \'btn-default\'" ' +
                        'style="padding: 15px;" ng-click="shipped()" ' +
                        'ng-disabled="working || order.status == \'shipped\' || order.status == \'pending-approval-by-customer\'" ' +
                        'i18n code="purchase.orders.status.shipped" read-only>' +
                        '<i class="fa fa-ship fa-fw"></i> {{::var}}' +
                        '</button>' +
                        '</li>' +
                        '</ol>' +
                        '</div>' +

                        '</form>' +
                        '<div class="bin-menu-edit-actions">' +
                        '<button type="button" class="btn btn-danger pull-left" ' +
                        'ng-if="order.status == \'pending-approval-by-customer\' && !cancelOrderConfirmation" ' +
                        'ng-click="cancelOrder()" ng-disabled="working" i18n code="purchase.orders.cancel.order.button" read-only>{{::var}}</button>' +
                        '<button type="button" class="btn btn-success pull-left" ' +
                        'ng-show="cancelOrderConfirmation" ' +
                        'ng-click="cancelOrderAborted()" ng-disabled="working" i18n code="purchase.orders.go.back.button" read-only>{{::var}}</button>' +
                        '<button type="reset" class="btn btn-default" ng-click="close()" ng-disabled="working" ' +
                        'i18n code="clerk.menu.close.button" read-only>{{::var}}</button>' +
                        '</div>',
                        scope: rendererScope
                    });
                }
            }
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