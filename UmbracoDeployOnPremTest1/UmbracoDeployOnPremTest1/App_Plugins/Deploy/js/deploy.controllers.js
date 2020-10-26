angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.DashboardController',
    [
        '$scope', '$window', '$location', 'deployNavigation', 'deployConfiguration', 'contentResource', 'assetsService', 'deployService',
        function ($scope, $window, $location, deployNavigation, deployConfiguration, contentResource, assetsService, deployService) {

            var vm = this;

            vm.config = deployConfiguration;
            vm.openProject = openProject;
            vm.openPayment = openPayment;
            vm.openDocumentation = openDocumentation;
            vm.feedbackMessageLevel = '';
            vm.dropDownOpen = false;

            function init() {

                assetsService.load(["lib/moment/moment.min.js"], $scope);

                if(deployService.feedbackMessageLevel) {
                    deployService.feedbackMessageLevel().then(function(data) {
                        vm.feedbackMessageLevel = data.FeedbackMessageLevel;
                    });
                }
            }

            function openProject() {
                $window.open("https://www.s1.umbraco.io/project/" + vm.config.ProjectAlias);
            };

            
            function openPayment() {
                $window.open("https://www.s1.umbraco.io/project/" + vm.config.ProjectAlias + '/paymentmethod');
            };

            function openDocumentation() {
                $window.open("https://our.umbraco.org/Documentation/Umbraco-Cloud/");
            };

            init();

            vm.navigation = deployNavigation;
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.OnPremDashboardController',
    [
        '$scope', '$window', '$location', 'deployNavigation', 'deployConfiguration', 'deployQueueService', 'assetsService', 'deployService',
        function ($scope, $window, $location, deployNavigation, deployConfiguration, deployQueueService, assetsService, deployService) {
            var vm = this;

            vm.config = deployConfiguration;
            vm.openProject = openProject;
            vm.openPayment = openPayment;
            vm.openDocumentation = openDocumentation;
            vm.feedbackMessageLevel = '';
            vm.dropDownOpen = false;

            function init() {

                assetsService.load(["lib/moment/moment.min.js"], $scope);

                deployQueueService.isLicensed().then(function (check) {
                    vm.isLicensed = check;
                });;

                if(deployService.feedbackMessageLevel) {
                    deployService.feedbackMessageLevel().then(function(data) {
                        vm.feedbackMessageLevel = data.FeedbackMessageLevel;
                    });
                }
            }

            function openProject() {
                $window.open("https://www.s1.umbraco.io/project/" + vm.config.ProjectAlias);
            };

            
            function openPayment() {
                $window.open("https://www.s1.umbraco.io/project/" + vm.config.ProjectAlias + '/paymentmethod');
            };

            function openDocumentation() {
                $window.open("https://our.umbraco.org/Documentation/Umbraco-Cloud/");
            };

            init();

            vm.navigation = deployNavigation;
        }
    ]);

angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.AddToQueueDialogController',
    [
        '$scope', 'deployConfiguration', 'deployQueueService', 'navigationService', 'deployHelper',
        function($scope, deployConfiguration, deployQueueService, navigationService, deployHelper) {
            var vm = this;

            vm.deployConfiguration = deployConfiguration;
            vm.addedToQueue = false;
            vm.includeDescendants = false;
            vm.item = $scope.currentNode;

            vm.withBranch = vm.item.hasChildren
                && vm.item.nodeType !== 'form'
                && (vm.item.nodeType !== 'document-type-blueprints') // blueprint content type node
                && (vm.item.nodeType || !vm.item.routePath.startsWith('settings/contentBlueprints/')) // blueprint main node
                ;

            vm.addToQueue = function(item) {
                var deployItem = deployHelper.getDeployItem(vm.item, vm.includeDescendants);
                deployQueueService.addToQueue(deployItem);
                vm.addedToQueue = true;
            };

            vm.closeDialog = function() {
                navigationService.hideDialog();
            };
        }
    ]);
(function () {
    "use strict";

    function DeployDialogController($scope, deployResource, deploySignalrService, angularHelper, deployHelper, deployService, deployConfiguration, navigationService, editorState) {

        var vm = this;
        var timestampFormat = 'MMMM Do YYYY, HH:mm:ss';
        var serverTimestampFormat = 'YYYY-MM-DD HH:mm:ss,SSS';

        vm.config  = deployConfiguration;
        vm.currentNode = editorState.current;
        vm.deploy = {};
        vm.includeDescendants = false;
        vm.deployButtonState = 'init';
        vm.feedbackMessageLevel = '';

        vm.startInstantDeploy = startInstantDeploy;
        vm.resetDeploy = resetDeploy;
        vm.closeDialog = closeDialog;

        function onInit() {
            // reset the deploy progress
            resetDeploy();
            if(deployService.feedbackMessageLevel) {
                deployService.feedbackMessageLevel().then(function(data) {
                    vm.feedbackMessageLevel = data.FeedbackMessageLevel;
                });
            }
        };
        

        function startInstantDeploy() {

            var deployItem = deployHelper.getDeployItem(vm.currentNode, vm.includeDescendants);
            vm.deployButtonState = 'busy';

            deployService.instantDeploy(deployItem, vm.enableWorkItemLogging).then(function (data) {

                vm.deploy.deployProgress = 0;
                vm.deploy.status = 'inProgress';
                vm.deploy.currentActivity = "Please wait...";
                vm.deploy.timestamp = moment().format(timestampFormat);

                vm.deployButtonState = 'init';

                if (vm.enableWorkItemLogging) {
                    vm.deploy.showDebug = true;
                }

            }, function (error) {

                //Catching the 500 error from the request made to the UI/API Controller to trigger an instant deployment
                //Other errors will be caught in 'deploy:sessionUpdated' event pushed out

                //We don't have ClassName in our Exception here but ExceptionType is what we have
                //Push in the value manually into our error/exception object
                error['ClassName'] = error.ExceptionType;

                vm.deploy.status = 'failed';
                vm.deploy.error = {
                    hasError: true,
                    comment: error.Message,
                    exception: error,
                    timestamp: moment().format(timestampFormat)
                };

                vm.deployButtonState = 'init';

            });
        };

        function resetDeploy() {
            vm.deploy = {
                'deployProgress': 0,
                'currentActivity': '',
                'status': '',
                'error': {},
                'trace': '',
                'showDebug': false
            };
        };

        function closeDialog() {
            navigationService.hideDialog();
        }

        $scope.$on('deploy:sessionUpdated', function (event, args) {

            // make sure the event is for us
            if (args.sessionId === deployService.sessionId) {
                angularHelper.safeApply($scope, function () {

                    vm.deploy.deployProgress = args.percent;
                    vm.deploy.currentActivity = args.comment;
                    vm.deploy.status = deployHelper.getStatusValue(args.status);
                    vm.deploy.timestamp = moment().format(timestampFormat);
                    vm.deploy.serverTimestamp = moment(args.serverTimestamp).format(serverTimestampFormat);

                    if (vm.deploy.status === 'failed' ||
                        vm.deploy.status === 'cancelled' ||
                        vm.deploy.status === 'timedOut') {

                        vm.deploy.error = {
                            hasError: true,
                            comment: args.comment,
                            log: args.log,
                            exception: args.exception
                        };
                    }
                });
            }

        });

        // signalR heartbeat
        $scope.$on('deploy:heartbeat', function (event, args) {
            if (!deployService.isOurSession(args.sessionId)) return;

            angularHelper.safeApply($scope, function () {
                if(vm.deploy) {
                    vm.deploy.timestamp = moment().format(timestampFormat);
                    vm.deploy.serverTimestamp = moment(args.serverTimestamp).format(serverTimestampFormat);
                }
            });

        });

        // signalR debug heartbeat
        $scope.$on('deploy:heartbeat', function (event, args) {
            if (!deployService.isOurSession(args.sessionId)) return;
            angularHelper.safeApply($scope, function () {
                vm.deploy.trace += "❤<br />";
            });
        });

        vm.showDebug = function () {
            vm.deploy.showDebug = !vm.deploy.showDebug;
        };

        var search = window.location.search;
        vm.enableWorkItemLogging = search === '?ddebug';

        // debug

        // beware, MUST correspond to what's in WorkStatus
        var workStatus = ["Unknown", "New", "Executing", "Completed", "Failed", "Cancelled", "TimedOut"];

        function updateLog(event, sessionUpdatedArgs) {

            // make sure the event is for us
            if (deployService.isOurSession(sessionUpdatedArgs.sessionId)) {
                angularHelper.safeApply($scope, function () {
                    var progress = sessionUpdatedArgs;
                    vm.deploy.trace += "" + progress.sessionId.substr(0, 8) + " - " + workStatus[progress.status] + ", " + progress.percent + "%"
                        + (progress.comment ? " - <em>" + progress.comment + "</em>" : "") + "<br />";
                    if (progress.log)
                        vm.deploy.trace += "<br />" + filterLog(progress.log) + "<br /><br />";
                    //console.log("" + progress.sessionId.substr(0, 8) + " - " + workStatus[progress.status] + ", " + progress.percent + "%");
                });
            }
        }

        function filterLog(log) {
            log = log.replace(/(?:\&)/g, '&amp;');
            log = log.replace(/(?:\<)/g, '&lt;');
            log = log.replace(/(?:\>)/g, '&gt;');
            log = log.replace(/(?:\r\n|\r|\n)/g, '<br />');
            log = log.replace(/(?:\t)/g, '  ');
            log = log.replace('-- EXCEPTION ---------------------------------------------------', '<span class="umb-deploy-debug-exception">-- EXCEPTION ---------------------------------------------------');
            log = log.replace('----------------------------------------------------------------', '----------------------------------------------------------------</span>');
            return log;
        }

        // note: due to deploy.service also broadcasting at beginning, the first line could be duplicated
        $scope.$on('deploy:sessionUpdated', updateLog);
        $scope.$on('restore:sessionUpdated', updateLog);

        onInit();
    }

    angular.module("umbraco.deploy").controller("UmbracoDeploy.DeployDialogController", DeployDialogController);
})();
(function () {
    "use strict";

    function PartialRestoreDialogController($scope, deploySignalrService, deployService, angularHelper, deployConfiguration, deployHelper, backdropService, navigationService, editorService) {

        var vm = this;
        var timestampFormat = 'MMMM Do YYYY, HH:mm:ss';
        var serverTimestampFormat = 'YYYY-MM-DD HH:mm:ss,SSS';

        vm.config = deployConfiguration;
        vm.restoreWorkspace = {};
        vm.restore = {};
        vm.restoreButtonState = "init";
        vm.workspaceDropDownOpen = false;

        // Need to change a few UI of buttons & text copy
        // Also needed to change/call the remote media tree when opening the new dialog
        vm.isMediaSection = $scope.currentNode.section.toLowerCase() === "media";
        vm.pickRemoteNodeLabel = vm.isMediaSection ? "Select media to restore" : "Select content to restore";

        resetRestoreNode();
        vm.toggleIncludeChildren = function() {
            vm.includeChildren = !vm.includeChildren;
        }

        vm.feedbackMessageLevel = '';

        vm.changeDestination = changeDestination;
        vm.startRestore = startRestore;
        vm.resetRestore = resetRestore;
        vm.closeDialog = closeDialog;

        var nodeUdis = [];

        vm.pickRemoteNode = pickRemoteNode;

        function resetRestoreNode() {
            vm.restoreNodeIsExternal = false;
            vm.restoreNode = null;
            if ($scope.currentNode.id !== "-1") {
                vm.restoreNode = $scope.currentNode;
            }
            vm.includeChildren = true;
        }

        function onInit() {
            // reset restore progress
            resetRestore();

            // set the last workspace to restore from as default
            if(vm.config.RestoreWorkspaces) {
                //var lastWorkspaceIndex = vm.config.Workspaces.length - 1;
                vm.restoreWorkspace = _.last(vm.config.RestoreWorkspaces);//[lastWorkspaceIndex];
            }
            
            if(deployService.feedbackMessageLevel) {
                deployService.feedbackMessageLevel().then(function(data) {
                    vm.feedbackMessageLevel = data.FeedbackMessageLevel;
                });
            }
        }

        function freezeContextMenu() {
            backdropService.open({
                disableEventsOnClick: true,
                element: '#um-deploy-partial-restore-dialog',
                elementPreventClick : true,
            });
            backdropService.setOpacity(0);
        }

        function thawContextMenu() {
            backdropService.close();
        }
        
        function changeDestination(workspace) {
            vm.restoreWorkspace = workspace;
            resetRestoreNode();
        }

        function pickRemoteNode(workspace) {

            var treeAlias = vm.isMediaSection ? "externalMedia" : "externalContent";
            var entityType = vm.isMediaSection ? "Document" : "Media";

            var partialItemPicker = {
                section: "deploy",
                treeAlias: treeAlias,
                entityType: entityType,
                multiPicker: false,
                title: "Select a remote node",
                customTreeParams: "workspace="+workspace.Url,
                select: function(node) {
                    vm.restoreNodeIsExternal = true;
                    vm.restoreNode = node;
                    editorService.close();
                },
                close: function () {
                    editorService.close();
                }
            };

            editorService.treePicker(partialItemPicker);
        }
        
        function startRestore(workspace) {

            var restoreNodes = [];

            vm.restoreButtonState = "busy";
            freezeContextMenu();

            restoreNodes = [
                {
                    id: vm.restoreNode.id,
                    udi: vm.restoreNode.udi,
                    includeDescendants: vm.includeChildren
                }
            ];

            deployService.partialRestore(workspace.Url, restoreNodes, vm.enableWorkItemLogging)
                .then(function(data) {

                        vm.restore.status = 'inProgress';
                        vm.restore.restoreProgress = 0;
                        vm.restore.currentActivity = "Please wait...";
                        vm.restore.timestamp = moment().format(timestampFormat);

                        vm.restoreButtonState = "init";

                        if (vm.enableWorkItemLogging) {
                            vm.restore.showDebug = true;
                        }

                    },
                    function (error) {
                        //Catching the 500 error from the request made to the UI/API Controller to trigger an instant deployment
                        //Other errors will be caught in 'restore:sessionUpdated' event pushed out

                        //We don't have ClassName in our Exception here but ExceptionType is what we have
                        //Push in the value manually into our error/exception object
                        error['ClassName'] = error.ExceptionType;

                        vm.restore.status = 'failed';
                        vm.restore.error = {
                            hasError: true,
                            comment: error.Message,
                            exception: error
                        };

                        vm.restoreButtonState = "init";

                    });

        }

        function resetRestore() {
            vm.restore = {
                'restoreProgress': 0,
                'targetName': '',
                'currentActivity': '',
                'status': '',
                'error': {},
                'trace': '',
                'showDebug': false
            };
        }

        $scope.$on('restore:sessionUpdated', function (event, args) {
            // make sure the event is for us
            if (args.sessionId === deployService.sessionId) {

                angularHelper.safeApply($scope, function () {

                    vm.restore.restoreProgress = args.percent;
                    vm.restore.currentActivity = args.comment;
                    vm.restore.status = deployHelper.getStatusValue(args.status);
                    vm.restore.timestamp = moment().format(timestampFormat);
                    vm.restore.serverTimestamp = moment(args.serverTimestamp).format(serverTimestampFormat);

                    if (vm.restore.status === 'failed' ||
                        vm.restore.status === 'cancelled' ||
                        vm.restore.status === 'timedOut') {
                        vm.restore.error = {
                            hasError: true,
                            comment: args.comment,
                            log: args.log,
                            exception: args.exception
                        };
                    }
                });
            }
        });

        // signalR heartbeat
        $scope.$on('restore:heartbeat', function (event, args) {
            if (!deployService.isOurSession(args.sessionId)) return;
            angularHelper.safeApply($scope, function () {
                if(vm.restore) {
                    vm.restore.timestamp = moment().format(timestampFormat);
                    vm.restore.serverTimestamp = moment(args.serverTimestamp).format(serverTimestampFormat);
                }
            });

        });

        vm.selectNode = function (node, event) {
            var newArray = [];
            if (!node.selected) {
                node.selected = true;
                nodeUdis.push(node.Udi);
            } else {
                angular.forEach(nodeUdis, function (nodeUdi) {
                    if (nodeUdi !== node.Udi) {
                        newArray.push(nodeUdi);
                    }
                });
                node.selected = false;
                nodeUdis = newArray;
            }
            event.stopPropagation();
        };

        // signalR debug heartbeat
        $scope.$on('deploy:heartbeat', function (event, args) {
            if (!deployService.isOurSession(args.sessionId)) return;
            angularHelper.safeApply($scope, function () {
                vm.restore.trace += "❤<br />";
            });
        });

        vm.showDebug = function () {
            vm.restore.showDebug = !vm.restore.showDebug;
        };

        var search = window.location.search;
        vm.enableWorkItemLogging = search === '?ddebug';

        // debug

        // beware, MUST correspond to what's in WorkStatus
        var workStatus = ["Unknown", "New", "Executing", "Completed", "Failed", "Cancelled", "TimedOut"];

        function updateLog(event, sessionUpdatedArgs) {

            // make sure the event is for us
            if (deployService.isOurSession(sessionUpdatedArgs.sessionId)) {
                angularHelper.safeApply($scope, function () {
                    var progress = sessionUpdatedArgs;
                    vm.restore.trace += "" + progress.sessionId.substr(0, 8) + " - " + workStatus[progress.status] + ", " + progress.percent + "%"
                        + (progress.comment ? " - <em>" + progress.comment + "</em>" : "") + "<br />";
                    if (progress.log)
                        vm.restore.trace += "<br />" + filterLog(progress.log) + "<br /><br />";
                    //console.log("" + progress.sessionId.substr(0, 8) + " - " + workStatus[progress.status] + ", " + progress.percent + "%");
                });
            }
        }

        function filterLog(log) {
            log = log.replace(/(?:\&)/g, '&amp;');
            log = log.replace(/(?:\<)/g, '&lt;');
            log = log.replace(/(?:\>)/g, '&gt;');
            log = log.replace(/(?:\r\n|\r|\n)/g, '<br />');
            log = log.replace(/(?:\t)/g, '  ');
            log = log.replace('-- EXCEPTION ---------------------------------------------------', '<span class="umb-deploy-debug-exception">-- EXCEPTION ---------------------------------------------------');
            log = log.replace('----------------------------------------------------------------', '----------------------------------------------------------------</span>');
            return log;
        }

        function closeDialog() {
            thawContextMenu();
            navigationService.hideDialog();
        }

        // note: due to deploy.service also broadcasting at beginning, the first line could be duplicated
        $scope.$on('deploy:sessionUpdated', updateLog);
        $scope.$on('restore:sessionUpdated', updateLog);

        onInit();
    }

    angular.module("umbraco.deploy").controller("UmbracoDeploy.PartialRestoreDialogController", PartialRestoreDialogController);
})();
(function () {
    "use strict";

    function RestoreDialogController($scope, deploySignalrService, deployService, angularHelper, deployConfiguration, deployHelper, backdropService, navigationService) {

        var vm = this;
        var timestampFormat = 'MMMM Do YYYY, HH:mm:ss';
        var serverTimestampFormat = 'YYYY-MM-DD HH:mm:ss,SSS';

        vm.config = deployConfiguration;
        vm.restoreWorkspace = {};
        vm.restore = {};
        vm.restoreButtonState = "init";
        vm.closeDialog = closeDialog;
        vm.feedbackMessageLevel = 'not';
        vm.dropDownOpen = false;

        vm.changeDestination = changeDestination;
        vm.startRestore = startRestore;
        vm.resetRestore = resetRestore;
        vm.feedbackMessageLevel = '';

        function onInit() {

            // reset restore progress
            resetRestore();

            // set the last workspace to restore from as default
            if(vm.config.RestoreWorkspaces) {
                vm.restoreWorkspace = _.first(vm.config.RestoreWorkspaces);
            }

            if(deployService.feedbackMessageLevel) {
                deployService.feedbackMessageLevel().then(function(data) {
                    vm.feedbackMessageLevel = data.FeedbackMessageLevel;
                });
            }
        }
        

        function freezeContextMenu() {
            backdropService.open({
                disableEventsOnClick: true,
                element: '#um-deploy-restore-dialog',
                elementPreventClick : true,
            });
            backdropService.setOpacity(0);
        }

        function thawContextMenu() {
            backdropService.close();
        }

        function changeDestination(workspace) {
            vm.restoreWorkspace = workspace;
        }

        function startRestore(workspace) {

            vm.restoreButtonState = "busy";
            freezeContextMenu();

            deployService.restore(workspace.Url, vm.enableWorkItemLogging)
                .then(function (data) {

                    vm.restore.status = 'inProgress';
                    vm.restore.restoreProgress = 0;
                    vm.restore.currentActivity = "Please wait...";
                    vm.restore.timestamp = moment().format(timestampFormat);

                    vm.restoreButtonState = "init";

                    if (vm.enableWorkItemLogging) {
                        vm.restore.showDebug = true;
                    }

                },
                function (error) {
                    //Catching the 500 error from the request made to the UI/API Controller to trigger an instant deployment
                    //Other errors will be caught in 'restore:sessionUpdated' event pushed out

                    //We don't have ClassName in our Exception here but ExceptionType is what we have
                    //Push in the value manually into our error/exception object
                    error['ClassName'] = error.ExceptionType;

                    vm.restore.status = 'failed';
                    vm.restore.error = {
                        hasError: true,
                        comment: error.Message,
                        exception: error
                    };

                    vm.restoreButtonState = "init";

                });
        }

        function resetRestore() {
            vm.restore = {
                'restoreProgress': 0,
                'targetName': '',
                'currentActivity': '',
                'status': '',
                'error': {},
                'trace': '',
                'showDebug': false
            };
        }

        $scope.$on('restore:sessionUpdated', function (event, args) {

            // make sure the event is for us
            if (args.sessionId === deployService.sessionId) {

                angularHelper.safeApply($scope, function () {

                    vm.restore.restoreProgress = args.percent;
                    vm.restore.currentActivity = args.comment;
                    vm.restore.status = deployHelper.getStatusValue(args.status);
                    vm.restore.timestamp = moment().format(timestampFormat);
                    vm.restore.serverTimestamp = moment(args.serverTimestamp).format(serverTimestampFormat);

                    if (vm.restore.status === 'failed' ||
                        vm.restore.status === 'cancelled' ||
                        vm.restore.status === 'timedOut') {

                        vm.restore.error = {
                            hasError: true,
                            comment: args.comment,
                            log: args.log,
                            exception: args.exception
                        };
                    }
                });
            }
        });

        // signalR heartbeat
        $scope.$on('restore:heartbeat', function (event, args) {
            if (!deployService.isOurSession(args.sessionId)) return;

            angularHelper.safeApply($scope, function () {
                if(vm.restore) {
                    vm.restore.timestamp = moment().format(timestampFormat);
                    vm.restore.serverTimestamp = moment(args.serverTimestamp).format(serverTimestampFormat);
                }
            });

        });

        // signalR debug heartbeat
        $scope.$on('deploy:heartbeat', function (event, args) {
            if (!deployService.isOurSession(args.sessionId)) return;
            angularHelper.safeApply($scope, function () {
                vm.restore.trace += "❤<br />";
            });
        });

        vm.showDebug = function () {
            vm.restore.showDebug = !vm.restore.showDebug;
        };

        var search = window.location.search;
        vm.enableWorkItemLogging = search === '?ddebug';

        // debug

        // beware, MUST correspond to what's in WorkStatus
        var workStatus = ["Unknown", "New", "Executing", "Completed", "Failed", "Cancelled", "TimedOut"];

        function updateLog(event, sessionUpdatedArgs) {

            // make sure the event is for us
            if (deployService.isOurSession(sessionUpdatedArgs.sessionId)) {
                angularHelper.safeApply($scope, function () {
                    var progress = sessionUpdatedArgs;
                    vm.restore.trace += "" + progress.sessionId.substr(0, 8) + " - " + workStatus[progress.status] + ", " + progress.percent + "%"
                        + (progress.comment ? " - <em>" + progress.comment + "</em>" : "") + "<br />";
                    if (progress.log)
                        vm.restore.trace += "<br />" + filterLog(progress.log) + "<br /><br />";
                    //console.log("" + progress.sessionId.substr(0, 8) + " - " + workStatus[progress.status] + ", " + progress.percent + "%");
                });
            }
        }

        function filterLog(log) {
            log = log.replace(/(?:\&)/g, '&amp;');
            log = log.replace(/(?:\<)/g, '&lt;');
            log = log.replace(/(?:\>)/g, '&gt;');
            log = log.replace(/(?:\r\n|\r|\n)/g, '<br />');
            log = log.replace(/(?:\t)/g, '  ');
            log = log.replace('-- EXCEPTION ---------------------------------------------------', '<span class="umb-deploy-debug-exception">-- EXCEPTION ---------------------------------------------------');
            log = log.replace('----------------------------------------------------------------', '----------------------------------------------------------------</span>');
            return log;
        }

        function closeDialog() {
            thawContextMenu();
            navigationService.hideDialog();
        }

        // note: due to deploy.service also broadcasting at beginning, the first line could be duplicated
        $scope.$on('deploy:sessionUpdated', updateLog);
        $scope.$on('restore:sessionUpdated', updateLog);

        onInit();
    }
    angular.module("umbraco.deploy").controller("UmbracoDeploy.RestoreDialogController", RestoreDialogController);
})();
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.AddWorkspaceController',
    [
        function() {
            var vm = this;

            vm.openAddEnvironment = function() {
                //window.open("https://www.s1.umbraco.io/project/" + vm.environment.alias + "?addEnvironment=true");
                alert('not implemented');
            }
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.DoneController',
    [
        'deployConfiguration', 'deployNavigation',
        function (deployConfiguration, deployNavigation) {
            var vm = this;

            vm.targetName = deployConfiguration.targetName;
            vm.targetUrl = deployConfiguration.targetUrl;

            vm.ok = function() {
                deployNavigation.navigate('queue');
            };
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.FlowController',
    [
        function () {
            var vm = this;
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.ProgressController',
    [
        '$scope', 'deployConfiguration', 'deployService', 'deployQueueService', 'deployNavigation',
        function($scope, deployConfiguration, deployService, deployQueueService, deployNavigation) {
            var vm = this;

            vm.progress = 0;

            vm.updateProgress = function(percent) {
                vm.progress = percent;
            };

            vm.deployConfiguration = deployConfiguration;

            $scope.$on('deploy:sessionUpdated', function(event, sessionUpdatedArgs) {

                // make sure the event is for us
                if (sessionUpdatedArgs.sessionId === deployService.sessionId) {

                        vm.progress = sessionUpdatedArgs.percent;
                        if (sessionUpdatedArgs.status === 3) { // Completed
                            deployNavigation.navigate('done-deploy');
                            deployQueueService.clearQueue();
                            deployService.removeSessionId();
                        } else if (sessionUpdatedArgs.status === 4) { // Failed
                            deployService.error = {
                                comment: sessionUpdatedArgs.comment,
                                log: sessionUpdatedArgs.log,
                                status: sessionUpdatedArgs.status
                            };
                            deployNavigation.navigate('error');
                        } else if (sessionUpdatedArgs.status === 5) { // Cancelled
                            deployService.error = {
                                comment: sessionUpdatedArgs.comment,
                                log: sessionUpdatedArgs.log,
                                status: sessionUpdatedArgs.status
                            };
                            deployNavigation.navigate('error');
                        } else if (sessionUpdatedArgs.status === 6) { // Timed out
                            deployService.error = {
                                comment: sessionUpdatedArgs.comment,
                                log: sessionUpdatedArgs.log,
                                status: sessionUpdatedArgs.status
                            };
                            deployNavigation.navigate('error');
                        }
                        else {
                            _.defer(function() { $scope.$apply(); });
                        }
                    }

                });

            // signalR heartbeat
            scope.$on('deploy:heartbeat', function (event, args) {
                if (!deployService.isOurSession(args.sessionId)) return;
                // fixme what shall we do?
                console.log('❤');
            });

            deployService.getStatus();
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.QueueController',
    [
        'deployConfiguration', 'deployQueueService', 'deploySignalrService', 'deployService',
        function(deployConfiguration, deployQueueService, deploySignalrService, deployService) {
            var vm = this;

            vm.deployConfiguration = deployConfiguration;

            vm.limitToItemAmount = 2;
            vm.showExpandLink = false;

            vm.items = deployQueueService.queue;

            vm.startDeploy = function() {
                deployService.deploy(vm.items);
            };

            vm.clearQueue = function() {
                deployQueueService.clearQueue();
            };

            vm.removeFromQueue = function (item) {
                deployQueueService.removeFromQueue(item);
            };

            vm.refreshQueue = function() {
                deployQueueService.refreshQueue();
            };

            vm.restore = function() {
                deployService.restore();
            };
        }
    ]);
angular.module('umbraco.deploy')
    .controller('UmbracoDeploy.WorkspaceInfoController',
        function() {
            var vm = this;
        });