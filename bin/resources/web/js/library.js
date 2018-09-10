

Sift.Library = (function() {
    
    // Constants
    var SLIDE_TIME = 500;               // Speed of our transition.
    var EMPTY_LIBRARY_TIMEOUT = 2000;   // How long we wait to declare the library empty

    // Static values
    // We track this so we can put the library scrollbars back where they should be.
    var libraryScrollTop = 0;
    
    // Set up resize dimensions logic
    // Whenever the window resizes, we adjust the page width, so scrollbars work right.
    function setupWindowResize() {
        var w = $(window);
        w.resize(function() {
            $("#pages .pageBundle").css({"width": 2 * w.width()});

            // @todo: lint complains about comparison w/implicit type 
            // conversion here. confirm that .left is indeed a number 
            // type. ignore warning in the meantime.
            /*jsl:ignore*/
            if($("#pages .pageBundle").position().left != 0) {
                $(".pageBundle").css({left: -w.width()});
            }
            /*jsl:end*/
            $("#pages .page").css({"height": w.height(), 
                                   "width": w.width()});
        }).resize();
    }
    
    // Set up the back link
    // Listen for a click on the link, call Sift.App.close, and animate a slide-right transition
    function setupBackLink() {
        $(".app.page .breadcrumb .back").unbind('click').click(function() {
            Sift.App.close();
        });
    }
    
    // Set up handler for when an app is opened
    // Listen for the custom event "appOpened" and animate a slide-left transition
    function setupAppOpenHandler() {
        var w = $(window);
        controlDeck.appOpened.connect(function() {
            libraryScrollTop = $(".library.page").scrollTop();
            $(".page").css({ "overflow-y": "hidden" });
            $(".pageBundle").animate({ left: -w.width() }, SLIDE_TIME, function() {
                $(".page").css({ "overflow-y": "auto" });
            });
        });
    }
    
    // Setup a timeout, if we don't see any apps added we 
    function setupMessages() {
        var alertContainer = $(".alertMessage");
        setTimeout(function() {
            if (Sift.App.count === 0 && Sift.App.proxyCount === 0) {
                Sift.Library.message(".empty");
            }
            else {
                Sift.Library.message(false);
            }
        }, EMPTY_LIBRARY_TIMEOUT);
        $("#pages .library.page").bind("appAdded proxyAdded", function() {
            Sift.Library.message(false);
        });
    }
    
    function setupUserSessionClearedHandler() {
        mainController.userLoggedOut.connect(function() {
            mainController.userLoggedOut.disconnect(arguments.callee);
            Sift.App.clearApps();
            Sift.Library.init();
        });
    }
    
    function setupAppClosedHandler() {
        controlDeck.appClosed.connect(function() {
            $(".page").css({ "overflow-y": "hidden" });
            $(".pageBundle").animate({ left: 0 }, SLIDE_TIME, function() {
                $(".page").css({ "overflow-y": "auto" });
                // Hack - set to 0, then to the proper value.
                // Otherwise scrollbars don't update properly.
                $(".library.page").scrollTop(0);
                $(".library.page").scrollTop(libraryScrollTop);
            });
        });
    }

    return {
        init: function() {
            setupWindowResize();
            setupBackLink();
            setupAppOpenHandler();
            setupMessages();
            setupUserSessionClearedHandler();
            setupAppClosedHandler();
        },

        message: function(childSelector) {
            var alertContainer = $(".alertMessage");
            if (!childSelector) {
                if (alertContainer.is(":visible")) {
                    alertContainer.fadeOut();
                    alertContainer.hide();
                    alertContainer.siblings('.body').fadeIn();
                }
            }
            else {
                alertContainer.find(childSelector).show();
                alertContainer.siblings('.body').hide();
                alertContainer.fadeIn();
            }
        },
        
        showApp: function(appID) {
            var openedApp = Sift.App.currentOpenApp();
            if (openedApp) {
                if (app != openedApp) {
                    // TODO - need to figure out this case still
                    // Switch from one app to another. Current app might be currently uploading, playing, etc.
                }
            }
            else {
                var app = Sift.App.apps[appID];
                if(app) {
                    app.view();
                }
            }
        },
        
        showLibrary: function() {
            Sift.App.close();
        }
    };

})();

appManager.loadingLocalApps.connect(function() {
    Sift.Tracker.trackEvent('library-load');
    $('#library-store-link').hide();
});

appManager.appLoadingStarted.connect(function(appIDString) {
    Sift.App.addProxyForPackage(appIDString);
});

appManager.localAppsLoaded.connect(function() {
    $('#library-store-link').fadeIn();
});

appManager.appLoadingError.connect(function(appIDString, message) {
    Sift.App.handleErrorOnAppLoad(appIDString, message);
});

appManager.cleared.connect(function() {
    Sift.App.clearApps();
});



$(document).ready(function() {
    Sift.Library.init();
});