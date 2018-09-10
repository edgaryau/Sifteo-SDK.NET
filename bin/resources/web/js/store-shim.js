// note: this currently runs before any other JS is loaded,
// so we don't have access to jQuery at parse-time.
;(function(undefined) {
    
    // ************************************ 
    // this is a quick-n-dirty shim layer to emulate older siftrunner behavior.
    // ************************************ 
    //console.log('evalling shim');
    if (mainController && ('getBuildTime' in mainController)) {     // roughly "are we newer than the EA version of siftrunner?"

        var shimUserSession = function(user) {
            if (!('userSession' in window)) {
                userSession = {};
            }
            userSession.developer = mainController.isInDeveloperMode();
            userSession.userID = (user ? user.getServerID() : 0);
            userSession.email = (user ? user.getEmailAddress() : '');
            userSession.buildTime = mainController.getBuildTime();
            userSession.softwareVerion = mainController.getSoftwareVersion();
            userSession.hardwareVersion = mainController.getHardwareVersion();
            userSession.sysInfoString = mainController.getSysInfoString();
            userSession.setPoints = (user ? function(balance) { return user.setPoints(balance); } : function() {});
            userSession.getPoints = (user ? function() { return user.getPoints(); } : function() { return 0; });
        };

        
        mainController.userLoggedIn.connect(function() {
            shimUserSession(loggedInUser);
        });

        mainController.userLoggedOut.connect(function() {
            shimUserSession(null);
        });
        
        if (loggedInUser) {
            shimUserSession(loggedInUser);
        }

        mainController.appPurchased = function(appID, title, coverArt, fileSize) {
            mainController.handleAppPurchased(appID, title, coverArt, fileSize);
        };
    }

    // ************************************
    // convenience for binding functions to an execution context
    // ************************************
    if (!Function.prototype._scope) {
        Function.prototype._scope = function(obj) {
            var f = this;
            return (function() {
                return f.apply(obj, arguments);
            });
        };
    }


    // ************************************ 
    // this is a start on a sketch of a more abstract-y layer to insulate the 
    // store from SR implementation details.
    //
    // the implementation will change, but the interface will hopefully remain
    // more or less consistent.
    // 
    // currently has enough functionality to provide real download progress
    // events to the store.
    // ************************************ 

    if (!('Sift' in window)) {
        Sift = {};
    }
    Sift.Runner = function() {
        this._appManager = new Sift.Runner.AppManager();
    };
    Sift.Runner.prototype = {
        getAppManager: function() {
            return this._appManager;
        }
    };
    
    Sift.Runner.App = function(appID) {
        this._id = appID;
        this._isLocal = false;
        // someday there won't be "remote" vs "local" apps
        // and this will be a lot simpler
        if (('_localApp_' + appID) in window) {
            this._qLocalApp = window['_localApp_' + appID];
            this._isLocal = true;
        }
        else {
            this._qLocalApp = null;
        }
        if (('_remoteApp_' + appID) in window) {
            this._qRemoteApp = window['_localApp_' + appID];
        }
        else {
            this._qRemoteApp = null;
        }
        var qManager = appManager;
        qManager.appDownloadStarted.connect((function() {
            $(this).trigger('downloadStarted');
        })._scope(this));
        qManager.appDownloadProgress.connect((function(remoteApp, d, progress, total) {
            $(this).trigger('downloadProgress', [progress, total]);
        })._scope(this));
        qManager.appDownloadFinished.connect((function() {
            $(this).trigger('downloadFinished');
        })._scope(this));
        qManager.appDownloadError.connect((function() {
            $(this).trigger('downloadError');
        })._scope(this));
    };
    Sift.Runner.App.prototype = {
        getID: function() {
            return this._id;
        },
        getTitle: function() {
            return this._getQApp().getTitle();
        },
        
        _getQApp: function() {
            if (this._isLocal) {
                return this._qLocalApp;
            }
            return this._qRemoteApp;
        },
        _becomeLocal: function() {
            this._isLocal = true;
        }
    };
    
    Sift.Runner.AppManager = function() {
        this._qAppManager = appManager;
        this._apps = {};
        var loadedAppIDs = this._qAppManager.getLocalAppIDs();
        for (var i = 0; i < loadedAppIDs.length; i++) {
            this._apps[loadedAppIDs[i]] = new Sift.Runner.App(loadedAppIDs[i]);
            $(this).trigger('appAdded', [this._apps[loadedAppIDs[i]]]);
        }
    };
    Sift.Runner.AppManager.prototype = {
        getApps: function() {
            return this._apps;
        },
        
        // temp. called by StoreWebView to trigger the appAdded
        // event by hand. someday we can connect to the app manager
        // directly.
        _handleAppDownloadStarted: function(newAppID) {
            this._apps[newAppID] = new Sift.Runner.App(newAppID);
            $(this).trigger('appAdded', [this._apps[newAppID]]);
            
            // have to trigger the app's download event by hand. sigh.
            $(this._apps[newAppID]).trigger('downloadStarted');
        },
        _handleAppLoaded: function(appID) {
            if (appID in this._apps) {
                this._apps[appID]._becomeLocal();
            }
            else {
                this._apps[appID] = new Sift.Runner.App(appID);
                $(this).trigger('appAdded', [this._apps[appID]]);
            }
        }
    };
    
    // old-skool
    document.addEventListener('DOMContentLoaded', function() {
        Sift.runner = new Sift.Runner();
        
        /* 
         * TEST CODE FOR DOWNLOAD HOOKS
         * SHOULD WORK ONCE JQUERY ON THE STORE IS UPDATED TO 1.4.4
         */ 
/*
        $(Sift.runner.getAppManager()).bind('appAdded', function(event, app) {

            // is this the app we're looking for?
//            if (app.getID() == appID) {
                var onStarted = function() { console.log('app download started'); };
                var onProgress = function(event, bytesComplete, bytesTotal) { console.log('app download progress: ' + bytesComplete + '/' + bytesTotal); };
                var onError = function(event, message) { console.log('download error: ???'); };
                var onFinished = function() {
                    console.log('download finished!');

                    // unbind stuff
                    $(app).unbind('downloadStarted', onStarted);
                    $(app).unbind('downloadProgress', onProgress);
                    $(app).unbind('downloadError', onError);
                    $(app).unbind('downloadFinished', onFinished);
                };

                $(app).bind('downloadStarted', onStarted);
                $(app).bind('downloadProgress', onProgress);
                $(app).bind('downloadError', onError);
                $(app).bind('downloadFinished', onFinished);

                // unbind ourself!
                $(Sift.runner.getAppManager()).unbind('appAdded', arguments.callee);
//            }
        });
*/
    });
})();