

if(Sift == undefined) {
    var Sift = {};
}

// --- SiftApp -------------------------------------------------------------

Sift.App = function() {

    var SiftAppClass;
    var appLibraryContainer = ".page.library .apps";
    var controllerDialog = ".app.page";
    var openedApp = null;

    function sanitizeHTML_URL(url) { 
        return url;
    }
    function sanitizeHTML_ID(id) { 
        return "app-id-" + id;
    }

    // Set up event bindings for when we start/stop/pause/unpause
    // @fixme: This is somehow preventing the DIY tab from handling things.
    controlDeck.appOpened.connect(function(appID) {
        siftDebug.log('Sift.App appOpened: ' + appID);
        Sift.App.handleAppOpened(appID);
    });
    // @fixme: This is somehow preventing the DIY tab from handling things.
    controlDeck.appClosed.connect(function(appID) {
        Sift.App.handleAppClosed(appID);
    });

    // @fixme: This is somehow preventing the DIY tab from handling things.
    controlDeck.appStarted.connect(function() {
        openedApp.handleStarted();
    });
    // @fixme: This is somehow preventing the DIY tab from handling things.
    controlDeck.appPaused.connect(function() {
        openedApp.handlePaused();
    });
    // @fixme: This is somehow preventing the DIY tab from handling things.
    controlDeck.appUnpaused.connect(function() {
        openedApp.handleUnpaused();
    });
    // @fixme: This is somehow preventing the DIY tab from handling things.
    controlDeck.appStopped.connect(function() {
        openedApp.handleStopped();
    });
    controlDeck.appInitError.connect(function(message) {
        Sift.App.handleAppInitError(message);
    });
    controlDeck.notEnoughSiftsError.connect(function() {
        Sift.App.handleNotEnoughSiftsError();
    });
    controlDeck.requiredSiftCountMet.connect(function() {
        var d = $(controllerDialog);
        d.find('#not-enough-sifts').fadeOut();
        if (appManager.getPercentInstalled(openedApp.id) == 100) {
            showGameControls();
        }
        
    });
    controlDeck.requiredSiftCountNotMet.connect(function() {
        var d = $(controllerDialog);
        d.find('.controls .game, .controls .install, .uninstall, .install-controls, .install-status').hide();
        d.find('#not-enough-sifts p')
            .html('Connect ' + openedApp.requiredSiftCount + ' Sifteo cubes to play!')
            .parent()
                .fadeIn()
        ;
        if (d.find('#more-sifts-would-be-better:visible').length > 0) {
            d.find('#more-sifts-would-be-better').fadeOut();
        }
    });
    controlDeck.optimalSiftCountMet.connect(function() {
        $(controllerDialog).find('#more-sifts-would-be-better').fadeOut();
    });
    controlDeck.optimalSiftCountNotMet.connect(function() {
        var d = $(controllerDialog);
        d.find('#more-sifts-would-be-better p').html('This game works best with ' + openedApp.optimalSiftCount + ' cubes.');
        if (controlDeck.requiredSiftCountIsMet()) {
            // only show if we've met the required number
            d.find('#more-sifts-would-be-better p').parent().fadeIn();
        }
    });

    controlDeck.playEnabled.connect(function() {
        var d = $(controllerDialog);
        d.find('.playButton').siftButton('enable.controlDeckPlayEnabled');
    });
    controlDeck.playDisabled.connect(function() {
        var d = $(controllerDialog);
        d.find('.playButton').siftButton('disable.controlDeckPlayEnabled');
    });
    
    controlDeck.appIsUnplayable.connect(function() {
        $(controllerDialog).find('#app-is-unplayable').fadeIn();
    });
    
    controlDeck.appIsPlayable.connect(function() {
        $(controllerDialog).find('#app-is-unplayable').fadeOut();
    });
    
    siftEditor.onclonestarted.connect(function() {
      siftDebug.log('CLONE STARTED');
      Sift.App.close(); // return to main game screen
      var proxy = buildUnpackagingProxy('unknown-clone', true);
      $(appLibraryContainer).append(proxy);
    });
    
    siftEditor.onclonefinished.connect(function(clone) {
      siftDebug.log('CLONE FINISHED');
      siftDebug.log('  app: ' + clone);
      siftDebug.log('  appID: ' + clone.id);
    });
    
    siftEditor.onerror.connect(function(err) {
        siftDebug.log('ERROR');
        siftDebug.log('  err: ' + err);
        siftDebug.log('  err.name: ' + err.name);
        siftDebug.log('  err.message: ' + err.message);
        Sift.App.handleEditorError(err.message);
    });

    function trackAppEvent(app, eventName, opts)
    {
        if (!opts) {
            opts = {};
        }
        $.extend(opts, {
            'sift_app': app.title, 
            'sift_app_id': app.id
        });
        Sift.Tracker.trackEvent(eventName, opts);
    }

    function buildUnpackagingProxy(appID, cloning) {
        // yeah. this is kind of janky.
        // actually, it's really janky.
        var fakeApp = {
            id: appID,
            title: "Loading...",
            isDownloading: false,
            isUnpackaging: false,
            imageURL: "",
            isEditable: function() { return false; }
        };
        var jqElement = buildElement(fakeApp);
        jqElement
            .attr('id', jqElement.attr('id').replace('app-', 'proxy-'))
            .unbind('click')
            .addClass('unpackaging')
        ;
        if (cloning) {
            jqElement.addClass('cloning');
        }
        jqElement.find('img').attr('src', 'images/app-loading.gif');
        return jqElement;
    }
  
    function buildElement(app) {
      var element = $("<a></a>")
        .attr({
            "href": "#", 
            "id": "app-" + app.id,
            "title": app.title
        })
        .click(function() {
            if(!app.isDownloading && !app.isUnpackaging) {
                controlDeck.openApp(app.id);
            }
            return false;
        })
        .data('app', app)       // you can get a reference to the app object through the element here
        .addClass("appThumb")
        .append($("<img/>")
            .attr("src", app.imageURL))
        .append($("<span class='small title " + (app.isEditable() ? '' : 'hidden') + "'>" + Sift.softBreakString(app.title, 10) + "</span>"))
        .append($("<div class='progress-bar'></div>").progressbar({value: 0}))
        .append($("<span class='downloaded'></span>"))
        .append($("<span class='total'></span>"));
        return element;
    }

    function showChecking(app, msg) {
        var d = $(controllerDialog);
        d.find(".controls .install").hide();
        d.find('.uninstall').hide();
        d.find(".install-status").show();
        d.find('.install-controls').hide();
        $(controllerDialog).find(".install-status p").html(msg);
        mainWindow.resizeLibraryViewHack();
    }
  
    function showInstallOption(app) {
        var d = $(controllerDialog);
        app = app || openedApp;
        var percentInstalled = appManager.getPercentInstalled(app.id);
        d.find(".install-status").slideUp(function() {
            d.find(".controls .game").hide();
            d.find('.controls .installerButton, .controls .uninstallButton').siftButton('enable.installerControlsShown');

            if (percentInstalled > 0) {
                $('.install .percentInstalled').html(app.title + ' is ' + percentInstalled + '% installed.').show();
                d.find(".controls .installerButton").siftButton('option', 'label', 'Finish Installing');
                $('.uninstallButton').show();
            }
            else {
                $('.install .percentInstalled').hide();
                d.find(".controls .installerButton").siftButton('option', 'label', 'Install onto Cubes');
                $('.uninstallButton').hide();
            }

            d.find(".controls .install").fadeIn();
            d.find(".controls").fadeIn();
        });
        mainWindow.resizeLibraryViewHack();
    }

    function showInstalling(app) {
        var d = $(controllerDialog);
        d.data('installing', true);
        d.addClass("installing");
        d.find('.controls .game .sift-button, .controls .create .sift-button').siftButton('disable.installing');
        d.data('animating-show-installing', true);
        d.find(".controls .install, .controls .uninstall").slideUp(function() {
            d.find('.install-controls').fadeIn();
            d.find('.install-status .progress-bar').progressbar({ value: 0 });
            d.find('.install-status').fadeIn(400, function() {
                d.data('animating-show-installing', false);
            });
        });
        mainWindow.resizeLibraryViewHack();
    }
    
    function showUninstalling(app) {
        $('.uninstallButton').siftButton('disable.uninstalling').siftButton('option', 'label', 'Uninstalling');
        $('.controls .sift-button').siftButton('disable.uninstalling');
        mainWindow.resizeLibraryViewHack();
    }
    function hideUninstalling() {
        $('.controls .sift-button').siftButton('enable.uninstalling');
        $('.uninstallButton').siftButton('enable.uninstalling').siftButton('option', 'label', 'Uninstall');
        mainWindow.resizeLibraryViewHack();
    }

    function cancelInstallation() {
        var d = $(controllerDialog);
        d.data('installing', false);
        window.appManager.cancelAppInstallation();
    }

    function showGameControls() {
        if (openedApp) {
            if (openedApp.hasAssets()) {
                $('.uninstallButton').siftButton('enable.installerControlsShown').show();
            }
            else {
                $('.uninstallButton').siftButton('disable.installerControlsShown').hide();
            }
        }
        var d = $(controllerDialog);
        d.find(".controls").show();
        d.find(".controls .game").show();
        mainWindow.resizeLibraryViewHack();
        // d.find('.uninstall').show();
    }

    // actually does the closing
    function closeApp(app) {
        var d = $(controllerDialog);
        if (d.data('installing') && !(d.data('force-close'))) {
            if (confirm("Are you sure you want to cancel installing this app onto your Cubes?")) {
                cancelInstallation();
            }
            else {
                return false;
            }
        }
        if (controlDeck.appIsRunning()) {
            controlDeck.appStopped.connect(function() {
                controlDeck.appStopped.disconnect(arguments.callee);
                controlDeck.closeApp();
            });
            app.stop();
            return false;
        }
        
        if (!openedApp.isEditable() || openedApp.exitEditMode(false, true)) {
            controlDeck.closeApp();
        }
        
        return true;
    }

    function showApp(app, opts) {
        controlDeck.openApp(app.id);
    }

    // SiftApp Objects

    SiftAppClass = function(id, path, config, appObject, options) {
        var app = this;
        app.id = id;
        app.path = path;
        app.instructionsContainer = $("<div></div>");
        if(appObject) {
            // Sanitize HTML using Google Caja's html_sanitize method
            var instructionsContent = html_sanitize(appObject.getInstructionsContent(), sanitizeHTML_URL, sanitizeHTML_ID);
            app.instructionsContainer.html(instructionsContent);
            // app.instructionsContainer.html(appObject.getInstructionsContent());
            app.instructionsContainer.find("script, input, form, iframe, style").remove();
            app.instructionsContainer.find('a:not([href^="#")').click(function() {
                window.mainWindow.openLink($(this).attr("href"));
                return false;
            });
            app.instructionsContainer.find('img').each(function() {
                $(this).attr("src", appObject.getInstructionsPath() + "/" + $(this).attr("src"));
                // $(this).attr("style", "max-width: 100%");
            });
        }

        this.setQtAppObject(appObject);

        app.updateConfig(id, path, config);

        this.installAttempts = 0;
        this.lastInstallCanceled = false;
        this.isDownloading = false;
        this.isUnpackaging = false;
        this.inEditMode = false;
        
        SiftAppClass.apps[id] = this;
        SiftAppClass.count += 1;

        this.options = {};
        if(options) {
            $.extend(this.options, options);
        }
        
        this.element = buildElement(this);
        if (this.options && this.options.unloadable) {
            this.element.addClass('unloadable');
        }
        
        // clone-in-progress proxy
        var cloneProxy = $('#proxy-unknown-clone');
        if (this.isEditable() && cloneProxy.length) {
            this.element.css('display', 'none');
            cloneProxy.replaceWith(this.element);
            var thumb = this.element;
            // cheesy blinking animation
            setTimeout(function() {
                thumb.fadeIn(200, function() {
                    $('.library.page').scrollTop(thumb.offset().top + $('.library.page').scrollTop());
                    for (var i = 0; i < 3; i++) {
                        setTimeout(function() {
                            thumb.fadeOut(200, function() {
                                // note: fading in here was causing a random extra scroll in 
                                // the page view in some cases. no idea why.
                                thumb.show();
                            });
                        }, i * 400);
                    }
                });
            }, 800);
        }
        
        // normal proxy
        var jqProxy = $('#proxy-' + id);
        if (jqProxy.length) {
            jqProxy.replaceWith(this.element);
        }
        else {
            $(appLibraryContainer).append(this.element);
        }
        $(appLibraryContainer).trigger("appAdded");
    };


    // --- Class Methods ------------------------------------------------------

    $.extend(SiftAppClass, {
        apps: {},    
        count: 0,
        proxies: {},
        proxyCount: 0,

        forceCloseDialog: function() {
            $(controllerDialog)
                .data('force-close', true)
                .dialog('close');
        },
        
        add: function(localAppObject) {
            var config = {};
            try {
                config = $.parseJSON(localAppObject.getManifest());
            }
            catch (e) {
                console.warn('could not parse json: ' + localAppObject.getManifest());
            }
            var opts;
            if ('app' in config) {
                config = config["app"];
            } else {
                if (typeof opts == "object") {
                    opts.unloadable = true;
                }
                else {
                    opts = { unloadable: true };
                }
            }

            var existingApp = SiftAppClass.apps[localAppObject.getLookupKey()];
            var lookupKey = localAppObject.getLookupKey();
            var path = localAppObject.getURLEncodedPath();
            if (existingApp) {
                existingApp.setQtAppObject(localAppObject);
                existingApp.updateConfig(lookupKey, path, config);
                existingApp.setUnpackaging(false);
                existingApp.setDownloading(false);
                var instructionsContent = html_sanitize(localAppObject.getInstructionsContent(), sanitizeHTML_URL, sanitizeHTML_ID);
                existingApp.instructionsContainer.html(instructionsContent);
                // existingApp.instructionsContainer.html(localAppObject.getInstructionsContent());
                existingApp.instructionsContainer.find("script, input, form, iframe, style").remove();
                existingApp.instructionsContainer.find('a:not([href^="#")').click(function() {
                    window.mainWindow.openLink($(this).attr("href"));
                    return false;
                });
                existingApp.instructionsContainer.find('img').each(function() {
                    $(this).attr("src", localAppObject.getInstructionsPath() + "/" + $(this).attr("src"));
                    // $(this).attr("style", "max-width: 100%");
                });
                existingApp.rebuildViews();
            }
            else {
                // var newApp = new Sift.App(appID, title, imagePath, internalImagePath, description, requiredSiftCount, ".page.library .apps", opts);
                var newApp = new Sift.App(lookupKey, path, config, localAppObject);
            }
            //console.log("'" + config.title + "' created");
            Sift.App.sortApps();
        },
        
        sortApps: function() {
            var elements = $('.apps a');
            
            // partition
            var regularElements = [];
            var cloneableElements = [];
            var editableElements = [];
            var nonAppElements = [];
            for (var i = 0; i < elements.length; i++) {
                var app = $(elements[i]).data('app');
                if (app) {
                    if (('isEditable' in app) && app.isEditable()) {
                        editableElements.push(elements[i]);
                    }
                    else if (('isCloneable' in app) && app.isCloneable()) {
                        cloneableElements.push(elements[i]);
                    }
                    else {
                        regularElements.push(elements[i]);
                    }
                }
                else {
                    nonAppElements.push(elements[i]);
                }
            }
            
            // sort alphabetically within each partition
            $.each([regularElements, cloneableElements, editableElements], function(i, array) {
                array.sort(function(a, b) {
                    var aTitle = $(a).data('app').title.toLowerCase();
                    var bTitle = $(b).data('app').title.toLowerCase();
                    return (aTitle > bTitle ? 1 : (aTitle == bTitle ? 0 : -1));
                });
            });

            var container = $('.apps');
            $('.apps .divider').remove();
            
            container.append(regularElements);
            if (cloneableElements.length) {
                container.append('<div class="divider">Creativity Kit</div>');
                container.append(cloneableElements);
            }
            if (editableElements.length) {
                container.append('<div class="divider">My Creations</div>');
                container.append(editableElements);
            }
            
            // um. actually not sure what these would be.
            if (nonAppElements.length) {
                container.append('<div class="divider">&nbsp;</div>');
                container.append(nonAppElements);
            }

        },
        
        remove: function(lookupKey) {
            if (lookupKey in SiftAppClass.apps) {
                $('#app-' + lookupKey).remove();
                SiftAppClass.apps[lookupKey] = null;
                delete SiftAppClass.apps[lookupKey];
                SiftAppClass.apps.count -= 1;
            }
            if (lookupKey in SiftAppClass.proxies) {
                $('#proxy-' + lookupKey).remove();
                SiftAppClass.proxies[lookupKey] = null;
                delete SiftAppClass.proxies[lookupKey];
                SiftAppClass.proxyCount -= 1;
            }
            Sift.App.sortApps();
        },
    
        addProxyForPackage: function(lookupKey) {
            if (lookupKey in SiftAppClass.apps) {
                SiftAppClass.apps[lookupKey].setUnpackaging(true);
            }
            else {
                if (!(lookupKey in SiftAppClass.proxies)) {
                    SiftAppClass.proxies[lookupKey] = buildUnpackagingProxy(lookupKey);
                    SiftAppClass.proxyCount += 1;
                    $(appLibraryContainer)
                        .append(SiftAppClass.proxies[lookupKey])
                        .trigger('proxyAdded')
                    ;
                }
            }
        },
        
        getAppErrorBubbleTemplate: function(html, monsterPath) {
            monsterPath = monsterPath || 'images/albert_peabody-50px.png';
            return '\
                <div style="width:420px; padding:10px;">\
                    <img style="float:left; width:50px; margin: 50px 20px 40px 5px; padding:0 5px 10px; background:url(images/drop-shadow-65px.png) center bottom no-repeat;" src="' + monsterPath + '" />\
                    ' + html + '\
                </div>\
            ';
        },
        
        handleErrorOnAppLoad: function(appID, message) {
            var jqProxy = $('#proxy-' + appID);
            var bubbleContent = Sift.App.getAppErrorBubbleTemplate('<h3 style="margin-top:10px">There\'s Trouble in Sifteo City!</h3>\
                <p>\
                    We couldn\'t load one of your games!<br/> The file may be damaged.\
                </p>\
                <p>\
                    <nobr>You can try to <a class="redownload-app" href="#">download this game again</a>.</nobr>\
                </p>\
            ');
            var bubble = new Sift.Bubble(bubbleContent, {
                appendTo: $('section.library .apps'),
                scrollableParent: $('section.app.page'),
                pointerMargin: 60,
                strokeWeight:1
            });
            bubble.attach(jqProxy);
            $('a.redownload-app', bubble.jqContent).click(function() {
                appManager.downloadRemoteAppsByID([appID], loggedInUser.getAppsDirPath());
                Sift.App.remove(appID);
                bubble.remove();
            });
            jqProxy.click(function() {
                Sift.Bubble.hideAll();
                bubble.show();
            });
            if (jqProxy.length) {
                jqProxy
                    .removeClass('unpackaging').addClass('unloadable').attr('title', 'Couldn\'t load!')

                    .find('img')
                        .attr('src', 'images/app-unknown.png')
                    .end()
                    .find('.title')
                        .html('Couldn\'t Load!')
                ;
            }
        },
    
        clearApps: function() {
            //alert(SiftAppClass.count);
            //alert(SiftAppClass.apps);
            SiftAppClass.apps = {};
            SiftAppClass.proxies = {};
            SiftAppClass.proxyCount = 0;
            SiftAppClass.count = 0;
            $(".appThumb").remove();
        },

        addDownloading: function(appID, title, coverArtPath) {
            if(coverArtPath.indexOf("http") !== 0) {
                coverArtPath = Sift.appServerURLFor(coverArtPath);
            }

            var config = {
                "title": title,
                "coverArt": coverArtPath,
                "internalArt": "",
                "requiredSiftCount": 3,
                "optimalSiftCount": 3,
                "description": "",
                "remote": true
            };
            $('#app-' + appID).remove();
            var newApp = new Sift.App(appID, "", config);
            newApp.setDownloading(true);
            Sift.App.sortApps();
        },
    
        handleAppInstallationCanceled: function(reasonMessage) {
            if (reasonMessage.length) {
                var jqDialog = $("#cancel-install-dialog").dialog({
                    title: 'Canceling Installation',
                    buttons: { 'OK': function() { $(this).dialog('close'); } },
                    position: 'center',
                    modal: true,
                    resizable: false,
                    draggable: false
                });
                $('#cancel-install-dialog p').html(reasonMessage);
            }
            $(controllerDialog).find('.controls .game .sift-button, .controls .create .sift-button').siftButton('enable.installing');
            if (openedApp) {
                openedApp.lastInstallCanceled = true;
            }
            if (controlDeck.requiredSiftCountIsMet()) {
                if (openedApp) {
                    showInstallOption(openedApp);
                }
            }
        },
        
        showLinkDisconnectedDialog: function() {
            $(".show-tour").unbind().click(function() {
                mainWindow.showTour();
            });
            var jqDialog = $("#link-disconnected-dialog").dialog({
                title: (openedApp && openedApp.title || "App") + " Has Been Paused",
                buttons: { 'Stop App': function() { 
                    controlDeck.appStopped.connect(function() {
                        controlDeck.appStopped.disconnect(arguments.callee);
                        $("#link-disconnected-dialog").dialog('close');
                    });
                    openedApp && openedApp.stop();
                    $("#sifts-missing-dialog").parent('.ui-dialog').css('opacity', 1);
                    Sift.App.hideRequiredSiftsMissingDialog();
                }},
                position: 'center',
                modal: true,
                resizable: false,
                draggable: false,
                width: 600,
                closeOnEscape: false
            });
            $("#link-disconnected-dialog").dialog('widget').find('.ui-dialog-titlebar-close').hide();
            if ($('#sifts-missing-dialog').data('shown')) {
                // hide it without hiding it. kinda lame.
                $("#sifts-missing-dialog").parent('.ui-dialog').css('opacity', 0);
            }
        },
        
        hideLinkDisconnectedDialog: function() {
            $("#link-disconnected-dialog").dialog('close');
            // make sure we reset the opacity on the sifts-missing dialog.
            $("#sifts-missing-dialog").parent('.ui-dialog').css('opacity', 1);

            // if the sifts missing dialog is still "shown" (most likely case)
            // have it switch to the reconnecting version
            if ($("#sifts-missing-dialog").data('shown')) {
                $('#sifts-missing-dialog .reconnecting').show().find('.n-cubes').html(controlDeck.getNSiftsOnAppStart());
                $('#sifts-missing-dialog .missing').hide();
            }
            else {
                $('#sifts-missing-dialog .reconnecting').show();
                $('#sifts-missing-dialog .missing').hide();
            }
        },

        showRequiredSiftsMissingDialog: function() {
            /*
            var jqSlideshow = $("#sifts-missing-dialog .slideshow");
            jqSlideshow.cycle('destroy');
            jqSlideshow.cycle({ 
                fx:     'fade', 
                // speed:  'fast', 
                timeout: 8000, 
                next: "#sifts-missing-dialog .slideshow",
                pager:  '#sifts-missing-dialog .slideshowNav' 
            });
            */
            // there are two versions embedded in the dialog.
            // the main one says a cube is missing. the secondary one
            // is shown when a link had been pulled out and then is 
            // re-inserted, and before all the required cubes have reconnected.
            // if this method is called directly, we are in the missing mode.
            // the link dialog code will switch us to reconnecting mode if 
            // needed.
            // this is all a little hacky.
            $('#sifts-missing-dialog .reconnecting').hide();
            $('#sifts-missing-dialog .missing').show();
            
            $(".show-tour").unbind().click(function() {
                mainWindow.showTour();
            });
            var jqDialog = $("#sifts-missing-dialog").dialog({
                title: (openedApp && openedApp.title || "App") + " Has Been Paused",
                buttons: { 'Stop App': function() { 
                    controlDeck.appStopped.connect(function() {
                        controlDeck.appStopped.disconnect(arguments.callee);
                        //jqSlideshow.cycle('destroy');
                        $("#sifts-missing-dialog").dialog('close');
                        $('#sifts-missing-dialog').data('shown', false);
                    });
                    openedApp && openedApp.stop();
                }},
                position: 'center',
                modal: true,
                resizable: false,
                draggable: false,
                width: 600,
                closeOnEscape: false
            });
            $("#sifts-missing-dialog").dialog('widget').find('.ui-dialog-titlebar-close').hide();
            $('#sifts-missing-dialog').data('shown', true);
        },

        hideRequiredSiftsMissingDialog: function() {
            //$("#sifts-missing-dialog .slideshow").cycle('destroy');
            $("#sifts-missing-dialog").dialog('close');
            $('#sifts-missing-dialog').data('shown', false);
        },
    
        handleAppInitError: function(message) {
            var jqDialog = $("#app-startup-error").dialog({
                title: openedApp.title + " Could Not Start",
                position: 'center',
                buttons: { 'OK': function() { $(this).dialog('close'); }},
                modal: true,
                resizable: false,
                draggable: false
            });
            jqDialog.find('p').html(message);
        },

        handleNotEnoughSiftsError: function() {
            var jqDialog = $('#not-enough-sifts-error').dialog({
                title: openedApp.title + " Could Not Start",
                position: 'center',
                buttons: { 'OK': function() { $(this).dialog('close'); }},
                modal: true,
                resizable: false,
                draggable: false
            });
            var n = 3;
            jqDialog.find('p').html(openedApp.title + ' requires ' + n + ' cubes.');
        },
        
        handleAppIsUnresponsive: function() {
            var jqDialog = $('#app-is-unresponsive-warning').dialog({
                title: openedApp.title + ' Has Stopped Responding',
                position: 'center',
                width: 500,
                buttons: { 
                    // would be nice to be able to restart instead of force quit...
                    /*
                    'Restart Siftrunner': function() {
                        mainController.forceRestart();
                        $(this).dialog('close');
                    },
                    */
                    'Quit Siftrunner': function() {
                        mainController.forceQuit();
                    },
                    'Keep Waiting': function() {
                        $(this).dialog('close');
                    }
                },
                open: function() {
                    // focus keep waiting button
                    $(this).parents('.ui-dialog-buttonpane button:eq(0)').blur();
                    $(this).parents('.ui-dialog-buttonpane button:eq(1)').focus();
                },
                beforeClose: function() {
                    controlDeck.restartUnresponsiveAppTimer();
                },
                modal: true,
                resizable: false,
                draggable: false
            });
        },
        
        handleAppIsResponsiveAgain: function() {
            $('#app-is-unresponsive-warning').dialog('close');
        },

        handleAppFatalError: function() {
            var jqDialog = $('#app-fatal-error').dialog({
                title: openedApp.title + ' Has Encountered a Problem',
                position: 'center',
                width: 500,
                buttons: { 
                    'OK': function() {
                        $(this).dialog('close');
                    }
                },
                beforeClose: function() {
                    //mainController.forceQuit();
                },
                modal: true,
                resizable: false,
                draggable: false
            });
            // @todo: this will hide the close box, but still need to catch escape key
            //$("#app-fatal-error").dialog('widget').find('.ui-dialog-titlebar-close').hide();
        },
        
        // the "tryingToCloseApp" arg is a temporary wart.
        handleEditorError: function(errors, tryingToExitEditMode, tryingToCloseApp) {
            var message = 'Unknown Error';
            if (typeof errors == 'string') {
                message = errors;
            }
            else if (typeof errors == 'object') {
                if (errors.errors.length) {
                    if (errors.errors.length == 1) {
                        message = 'There was one problem with your puzzle:';
                    }
                    else {
                        message = 'There were ' + errors.errors.length + ' problems with your puzzle:';
                    }
                    message += '<ul>';
                    for (var i = 0; i < errors.errors.length; i++) {
                        message += '\
                            <li>' + errors.errors[i].message + '</li>\
                        ';
                    }
                    message += '</ul>';
                }
            }
            var buttons = {
                'OK': function() { $(this).dialog('close'); }
            };
            
            // this is all so ugly.
            if (tryingToExitEditMode) {
                buttons = { 
                    'Let Me Fix It': function() { 
                        $(this).dialog('close');
                        openedApp.enterEditMode();
                    }, 
                    'Close Without Fixing': function() {
                        $(this).dialog('close');
                        openedApp.exitEditMode(true);
                        if (tryingToCloseApp) {
                            // have to go straight to the controldeck.
                            // this is all. so. ugly.
                            controlDeck.closeApp();
                        }
                    }
                };
            }
            
            var jqDialog = $("#app-edit-error").dialog({
                title: "Editor Error",
                position: 'center',
                buttons: buttons,
                width: 500,
                modal: true,
                resizable: false,
                draggable: false
            });
            jqDialog.find('h4').html(openedApp.title);
            jqDialog.find('p').html(message);
        },

        showBatteryLowWarningDialog: function() {
            var jqDialog = $("#battery-low-dialog").dialog({
                title: openedApp.title + " Has Been Paused",
                position: 'center',
                modal: true,
                resizable: false,
                draggable: false
            });
        },
        
        currentOpenApp: function() {
            return openedApp; 
        },
        
        handleAppOpened: function(appID) {
            openedApp = SiftAppClass.apps[appID];
            
            var d = $(controllerDialog);

            openedApp.installAttempts = 0;

            // hide all controls and status
            d.find(".controls, .install-status").show();

            // Set up game controls
            d.find(".controls .game .playButton")
                .siftButton({ icons: {
                    primary: 'ui-icon-play'
                }})
                .unbind("click.play")
                .bind("click.play", function() {
                    if (controlDeck.playIsEnabled()) {
                        openedApp.start();
                    }
                    return false;
                })
                .show();
            d.find('.unpauseButton')
                .siftButton({
                    icons: {
                        primary: 'ui-icon-play'
                    }
                })
                .unbind('click.unpause')
                .bind('click.unpause', function() {
                    if (controlDeck.appIsPaused()) {
                        openedApp.unpause();
                    }
                    return false;
                })
                .hide();
            if (controlDeck.requiredSiftCountIsMet()) {
                d.find('#not-enough-sifts').hide();
            }
            else {
                d.find('#not-enough-sifts p').html('Connect ' + openedApp.requiredSiftCount + ' Sifteo cubes to play!').parent().fadeIn();
            }
            if (controlDeck.optimalSiftCountIsMet() || !controlDeck.requiredSiftCountIsMet()) {
                d.find('#more-sifts-would-be-better').hide();
            }
            else if (controlDeck.requiredSiftCountIsMet()) {
                d.find('#more-sifts-would-be-better p').html('This game works best with ' + openedApp.optimalSiftCount + ' cubes.').parent().fadeIn();
            }

            if (controlDeck.playIsEnabled()) {
                d.find('.playButton').siftButton('enable.controlDeckPlayEnabled');
            }
            else {
                d.find('.playButton').siftButton('disable.controlDeckPlayEnabled');
            }
            
            if (openedApp.isPlayable()) {
                $(controllerDialog).find('#app-is-unplayable').hide();
            }
            else {
                $(controllerDialog).find('#app-is-unplayable').show();
            }

            d.find('.controls .pauseButton')
                .siftButton({
                    icons: { primary: 'ui-icon-pause' }
                })
                .hide()
                .unbind('click.pause')
                .bind('click.pause', function() {
                    openedApp.pause();
                    return false;
                });
            d.find(".controls .stopButton")
                .siftButton({ 
                    icons: { primary: 'ui-icon-stop' }
                })
                .hide()
                .unbind("click.stop")
                .bind("click.stop", function() {
                    openedApp.stop();
                    return false;
                });
            d.find(".controls .editButton")
                //.hide()
                .siftButton({ 
                    icons: { primary: 'ui-icon-gear' },
                    width: 190
                })
                .unbind("click")
                .bind("click", function() {
                    if (!$(this).hasClass('disabled')) {
                        openedApp.enterEditMode();
                    }
                    return false;
                });
            d.find(".controls .cloneButton")
                //.hide()
                .siftButton({ 
                    icons: { primary: 'ui-icon-copy' },
                    width: 68
                })
                .unbind("click.clone")
                .bind("click.clone", function() {
                    if (!$(this).hasClass('disabled')) {
                        openedApp.clone();
                    }
                    return false;
                });
            if (openedApp.isCloneable()) {
                if (!openedApp.isEditable()) {
                    d.find(".controls .cloneButton")
                        .siftButton('option', 'label', 'Create Your Own')
                        .siftButton('option', 'width', 190);
                }
                else {
                    d.find(".controls .cloneButton")
                        .siftButton('option', 'label', 'Duplicate')
                        .siftButton('option', 'width', 68);
                }
            }
            d.find(".controls .deleteButton")
                //.hide()
                .siftButton({ 
                    icons: { primary: 'ui-icon-trash' },
                    width: 68
                })
                .unbind("click.delete")
                .bind("click.delete", function() {
                    if (!$(this).hasClass('disabled')) {
                       // @todo: should show a warning here
                        var appToRemove = openedApp;
                        Sift.App.close(); // return to main game screen
                        window.appManager.removeApp(appToRemove._app);
                    }
                    return false;
                });
// @reviewer-release: currently hiding the revert button
/*
            d.find('.controls .revertButton')
                .siftButton({ icons: {
                    primary: 'ui-icon-arrowreturn-1-w'
                }})
                .unbind('click')
                .click(function() {
                    if (!$(this).hasClass('disabled')) {
                        openedApp.restoreCachedCreationData();
                    }
                    return false;
                });
*/
            // Set up install controls
            d.find(".controls .install .installerButton")
                .siftButton({ 
                    icons: { primary: 'ui-icon-arrowthickstop-1-s' },
                    width: 190
                })
                .show()
                .unbind("click.install")
                .bind("click.install", function() {
                    openedApp.install();
                    return false;
                });
            d.find('.cancel-install')
                .siftButton({ icons: {
                    primary: 'ui-icon-cancel'
                    }})
                .unbind('click.cancelInstall')
                .bind('click.cancelInstall', function() {
                    if (confirm("Are you sure you want to cancel installing this app onto your Sifteo cubes?")) {
                        cancelInstallation();
                    }
                })
            ;

            d.find('.controls .uninstallButton')
                .siftButton({ icons: {
                    primary: 'ui-icon-trash'
                }})
                .unbind('click.uninstall')
                .bind('click.uninstall', function() {
                    if (confirm('Are you sure you want to uninstall this app from your Sifteo cubes?')) {
                        openedApp.uninstall();
                    }
                })
            ;
            // Populate window

            d.find("h1.title").html(openedApp.title);
            
            d.find(".description")
                .html(openedApp.description || "")
                .find("a")
                .addClass("remoteLink");
            d.find(".coverArt img").attr("src", openedApp.internalImageURL);
            d.find(".coverArt .title").html(Sift.softBreakString(openedApp.title, 10));
            d.find(".content .instructions").empty().append(openedApp.instructionsContainer.clone());
            d.find(".content .instructions").show();
            $('.editor').hide();
            d.scrollTop(0);

            // Deal with autostart and skipping app check
            if (!controlDeck.autostartIsEnabled()) {
                d.find('.controls .game, .controls .install, .install-controls, .install-status').hide();
                if (controlDeck.requiredSiftCountIsMet()) {
                    openedApp.checkInstall();
                }
            }
            else {
                showGameControls();
                $(controllerDialog).find(".playButton").trigger("click.play");
            }
            
            if (openedApp.isEditable()) {
                d.find('.controls .create').slideDown();    // note: if we just show(), the layout is sometimes borken
                d.find('.coverArt .title').show();
                // re-show these, because they may have been hidden if the master copy was previously shown
                d.find(".controls .editButton").show();
                d.find(".controls .cloneButton").show();
                d.find(".controls .deleteButton").show();
                
                var instructionsButton = $('<a id="ck-type-instructions-button" class="blue">Learn How To Make Creativity Kit: Sorting Games</a>');
                d.find(".content .instructions")
                    .hide()
                    .before(instructionsButton);
                instructionsButton.siftButton({ icons: { primary: 'ui-icon-arrowthick-1-s' }}).click(function() {
                    d.find(".content .instructions").slideToggle();
                });
                instructionsButton.before('<div class="ck-instructions"><div id="ck-instructions-container"></div></div>');
                siftEditor.open(openedApp._app);
                $('.editor').html(siftEditor.template.editorHTML);
                openedApp.loadCreation();
            }
            else {
                d.find('.controls .create').hide();
                d.find('.coverArt .title').hide();
                $('#ck-type-instructions-button').remove();
                $('.content .ck-instructions').remove();
                
                if (openedApp.isCloneable()) {
                    // master copy
                    d.find('.controls .create').slideDown();
                    d.find(".controls .editButton").hide();
                    d.find(".controls .cloneButton").show();
                    d.find(".controls .deleteButton").hide();
                }
            }
            if (openedApp.isCloneable()) {
                d.find(".controls .cloneButton").show();
            }
            else {
                d.find(".controls .cloneButton").hide();
            }
            
            openedApp.viewTime = new Date().getTime();
            trackAppEvent(openedApp, 'library-view');
        },
        
        handleAppClosed: function(appID) {
            var app = SiftAppClass.apps[appID];
            var closeTime = new Date().getTime();
            var durationOpen = closeTime - app.viewTime;
            trackAppEvent(this, 'library-close', {'duration': durationOpen});
            $('#ck-type-instructions-button, .content .ck-instructions').remove();
            
            // if the app close was initiated by controlDeck, an editable app
            // may still be in edit mode at this point. we need to force-exit
            // from it.
            if (app.isInEditMode()) {
                app.exitEditMode(true, true);
            }
            
            openedApp = null;
        },
        
        // class method, close current opened app, if any
        close: function() {
            if(openedApp !== null) {
                return closeApp(openedApp);
            }
            return true;
        },
        
        handleCubesCleared: function() {
            if (openedApp) {
                openedApp.handleCubesCleared();
            }
        },
        
        showInstalling: function() {
            showInstalling(openedApp);
        }
    });
    
    // --- Instance Methods ---------------------------------------------------
    // Things you can tell an app to do.
    // - refresh itself
    // - update itself given new configuration
    // - view (open)
    // - close
    // - start
    // - stop

    SiftAppClass.prototype = {

        rebuildViews: function() {
            if (this.element) {
                var newElement = buildElement(this);
                this.element.replaceWith(newElement);
                this.element = newElement;
                if (this.isEditable() && openedApp == this) {
                    $(controllerDialog).find('.coverArt .title').html(Sift.softBreakString(this.title, 10));
                }
            }
            Sift.App.sortApps();
        },

        setQtAppObject: function(appObject) {
            this._app = appObject;
            if (this._app) {
                this._app.appDataChanged.connect(this.updateFromAppObject._scope(this));
            }
        },
        
        // a hack to enable us to update js app state using the qt app object
        // instead of a manifest. we're only hitting those properties that
        // are important at the moment.
        //
        // @todo: eventually this whole app class should be reduced to be 
        // mostly a ref to the Qt app object.
        updateFromAppObject: function() {
            $.each(['title', 'description', 'requiredSiftCount', 'optimalSiftCount'], (function(i, prop) {
                this[prop] = this._app[prop];
            })._scope(this));
            this.rebuildViews();
        },
        
        updateConfig: function(lookupKey, path, config) {
            this.lookupKey = lookupKey;
            this.path = path;
            if (config.remote) {
                this.imageURL = config.coverArt;
                this.internalImageURL = config.coverArt;
            }
            else {
                this.imageURL = this.path + "/" + config["coverArt"];
                this.internalImageURL = (('internalArt' in config) && config.internalArt.length) ? this.path + "/" + config.internalArt : this.imageURL;
            }
            
            if (this.isEditable()) {
                var regex = /(.*)\.(png|gif|jpg|jpeg)/;
                regex.ignoreCase = true;
                this.imageURL = this.imageURL.replace(regex, '$1-creation.$2');
                this.internalImageURL = this.internalImageURL.replace(regex, '$1-creation.$2');
            }
            
            this.title = config["title"];
            this.description = config["description"];
            this.requiredSiftCount = config['requiredSiftCount'] || 3;
            this.optimalSiftCount = config['optimalSiftCount'] || 3;
            this.rebuildViews();
        },
    
        isEditable: function() {
            return this._app && this._app.editable;
        },
        
        isCloneable: function() {
            return this._app && this._app.cloneable;
        },
    
        isPlayable: function() {
            return this._app && this._app.playable;
        },
    
        isViewable: function() {
          return !(this.isDownloading || this.isUnpackaging);
        },

        isInEditMode: function() {
            return this.inEditMode;
        },
        
        hasAssets: function() {
            return (this._app && this._app.hasAssets);
        },

        start: function() {
            if(!controlDeck.appIsRunning()) {
                if (this.isEditable()) {
                    this.exitEditMode();
                }
                window.controlDeck.startApp(this.id);
            }
        },
        
        autoStart: function() {
            this.view({autoStart: true});
        },
    
        stop: function(force) {
            if(controlDeck.appIsRunning()) {
                window.controlDeck.stopApp();
            }
        },

        pause: function() {
            if (controlDeck.appIsRunning()) {
                window.controlDeck.pauseApp();
            }
        },

        unpause: function() {
            if (controlDeck.appIsRunning() && controlDeck.appIsPaused()) {
                window.controlDeck.unpauseApp();
            }
        },
        
        cacheCreationData: function(data) {
            this.cachedCreationData = siftEditor.readData();
// @reviewer-release: currently hiding the revert button
//            $('.revertButton').siftButton('disable.data-dirty');
        },
        
        restoreCachedCreationData: function() {
            this.loadCreation(this.cachedCreationData);
// @reviewer-release: currently hiding the revert button
//            $('.revertButton').siftButton('disable.data-dirty');
        },
        
        enterEditMode: function() {
            if (openedApp.isInEditMode()) {
                return true;
            }
            
            if (!siftEditor.template) {
                Sift.App.handleEditorError('Template not available');
                return false;
            }

            this.loadCreation();
            this.cacheCreationData();
            $(".editor").slideDown();
            // @reviewer-release: currently hiding the revert button
            //$('.revertButton').slideDown();    // note: if we just show(), the layout is sometimes borken
            
            var commit = function() {
                openedApp.saveCreation();
                openedApp.loadCreation();
                return true;
            };

            var handleKeydown = function(event, jqElement, lengthLimit) {
                if (event.which == 13) {    // return
                    commit();
                }
                if (jqElement.val().length >= lengthLimit && jqElement.get(0).selectionStart == jqElement.get(0).selectionEnd) { // allow anything if selection exists
                    return ([37, 38, 39, 40, 8, 16, 17, 18, 9].indexOf(event.which) != -1);  // arrow keys + backspace + command + option + shift + tab
                }
                return true;
            };

            // title
            var jqTitle = $(controllerDialog).find('h1.title');
            var jqTitleInput = $('<input class="title" name="title" type="text" style="width:100%"/>');
            jqTitle.before('<h3 id="ck-title-header">Title</h3>')
                .after(jqTitleInput)
                .hide();
            jqTitleInput.val(openedApp.title);
            jqTitleInput.change(commit);
            jqTitleInput.keydown(function(event) {
                return handleKeydown(event, jqTitleInput, 26);
            });
            
            // description
            var jqDescription = $(controllerDialog).find('section.description');
            var jqDescriptionInput = $('<input class="description" name="description" type="text" style="width:100%"/>');
            jqDescription.before('<h3 id="ck-description-header">On-Screen Instructions</h3>')
                .after(jqDescriptionInput)
                .hide();
            jqDescriptionInput.val(openedApp.description);
            jqDescriptionInput.change(commit);
            jqDescriptionInput.keydown(function(event) {
                return handleKeydown(event, jqDescriptionInput, 77);
            });

            
            var jqInstructions = $(controllerDialog).find('.content .ck-instructions');
            jqInstructions.addClass('editable');
            jqInstructions.before('<h3 id="ck-instructions-header">Instructions</h3>');
            jqInstructions.unbind('click').click(function() {
                jqInstructions.unbind('click').removeClass('editable');
                var container = $('#ck-instructions-container');
                jqInstructions.prepend('<div id="rte-editor-controls"></div>');
                jqInstructions.addClass('editing');
                var editor = new nicEditor({
                    buttonList: ['bold', 'italic', 'underline', 'ol', 'ul', 'hr'],
                    iconsPath: 'images/nicEditorIcons.gif'
                });
                editor.addInstance('ck-instructions-container');
                editor.setPanel('rte-editor-controls');
                var clickHandler = arguments.callee;
                // dumb work-around for nicEdit being too enthusiastic about firing events
                var blurred = false;
                editor.addEvent('blur', function() {
                    if (!blurred) {
                        //console.log('editor blur event');
                        editor.removeInstance('ck-instructions-container');
                        jqInstructions.click(clickHandler).addClass('editable');
                        jqInstructions.removeClass('editing');
                        $('#rte-editor-controls').remove();
                        blurred = true;
                    }
                });
            });
            
            $('.editButton')
                .siftButton('option', 'label', 'Done Editing')
                .addClass('editor-open')
                .unbind('click')
                .click(function() { 
                    if (!$(this).hasClass('disabled')) {
                        openedApp.exitEditMode(); 
                    }
                });
            openedApp.inEditMode = true;
            mainWindow.resizeLibraryViewHack();
            return true;
        },
        
        // "tryingToCloseApp" is a temporary and ugly wart.
        exitEditMode: function(force, tryingToCloseApp) {
            if (!openedApp.isInEditMode()) {
                return true;
            }

            var success = true;
            openedApp.saveCreation();
            var validationResults = {};
            this.templateMethods.validate(validationResults);
            if (validationResults.errors.length && !force) {
                Sift.App.handleEditorError(validationResults, true, tryingToCloseApp);
                success = false;
            }
            else {
                // @reviewer-release: currently hiding the revert button
                //$('.revertButton').slideUp();
                $('.editor').slideUp();
                $(controllerDialog).find('input[name=title]').remove();
                $(controllerDialog).find('input[name=description]').remove();
                $(controllerDialog).find('h1.title').show();
                $(controllerDialog).find('section.description').show();
                $('#ck-instructions-header, #ck-description-header, #ck-title-header').remove();
                var jqInstructions = $(controllerDialog).find('.content .ck-instructions');
                jqInstructions.unbind('click').removeClass('editable');
                $('.editButton')
                    .siftButton('option', 'label', 'Edit This Game')
                    .removeClass('editor-open')
                    .unbind('click')
                    .click(function() { 
                        if (!$(this).hasClass('disabled')) {
                            openedApp.enterEditMode();
                        }
                    });
                openedApp.loadCreation();
            }
            mainWindow.resizeLibraryViewHack();
            openedApp.inEditMode = !success;
            return success;
        },
        
        saveCreation: function() {
            if (this.isEditable() && 'templateMethods' in this) {
                this.templateMethods.save();
            }
            mainWindow.resizeLibraryViewHack();
        },
        
        loadCreation: function(optionalData) {
            if (this.isEditable() && ('templateMethods' in this)) {
                var data = optionalData || siftEditor.readData();
                this.templateMethods.load(data);

                // yuck
                // temp: jquery's html() method (or maybe webkit's innerHTML stuff) auto-converts
                // to html entities. we don't want the entities in our app data.
                // for now, just preserve a few common ones by hand.
                // better fix might be to use input fields for this instead of innerHTML.
                openedApp._app.startCoalescingChanges();
                openedApp._app.title = $(controllerDialog).find('h1.title').html();
                openedApp._app.description = $(controllerDialog).find('section.description').html();
                
                var replacements = {
                    '&lt;': '<',
                    '&gt;': '>', 
                    '&amp;': '&'
                };
                
                for (var entity in replacements) {
                    openedApp._app.title = openedApp._app.title.replace(entity, replacements[entity]);
                    openedApp._app.description = openedApp._app.description.replace(entity, replacements[entity]);
                }
                
                openedApp._app.optimalSiftCount = this.templateMethods.getOptimalSiftCount();
                openedApp._app.requiredSiftCount = this.templateMethods.getRequiredSiftCount();
                
                var validationResults = {};
                this.templateMethods.validate(validationResults);
                if (validationResults.errors.length) {
                    //Sift.App.handleEditorError(validationResults);
                    openedApp._app.playable = false;
                }
                else {
                    openedApp._app.playable = true;
                }
                openedApp._app.stopCoalescingChanges();
            }
        },
        
        setTemplateMethods: function(methods) {
            this.templateMethods = methods;
            var broadcaster = this.templateMethods.getEventBroadcaster();
            $(broadcaster).bind('data-changed', function() {
                openedApp.saveCreation();
                openedApp.loadCreation();
            });
            
            controlDeck.requiredSiftCountMet.connect(function() {
                $(broadcaster).trigger('check-sift-count', [controlDeck.getNSifts()]);
            });
            controlDeck.requiredSiftCountNotMet.connect(function() {
                $(broadcaster).trigger('check-sift-count', [controlDeck.getNSifts()]);
            });
            controlDeck.optimalSiftCountMet.connect(function() {
                $(broadcaster).trigger('check-sift-count', [controlDeck.getNSifts()]);
            });
            controlDeck.optimalSiftCountNotMet.connect(function() {
                $(broadcaster).trigger('check-sift-count', [controlDeck.getNSifts()]);
            });
            
        },
        
        clone: function() {
          siftEditor.clone(this._app);
        },

        setDownloadProgress: function(completed, total) {
            var progressBar = this.element.find(".progress-bar");
            if (total > 0) {
                var value = Math.floor(100 * completed / total);
                progressBar.progressbar("option", "value", value);
            }
            else {
                progressBar.progressbar("option", "value", 100);
                this.element.addClass('indeterminate');
            }
        },
    
        setDownloadError: function() {
          this.element.addClass("downloadError");
          this.element.attr("title", "Error downloading this app.");
        },
        
        setDownloading: function(d) {
            this.isDownloading = d;
            this.element.toggleClass("downloading", d);
            this.element.find('.title').html(d ? 'Downloading&hellip;' : this.title);
        },
    
        setUnpackaging: function(isUnpackaging) {
            this.isUnpackaging = isUnpackaging;
            this.element.toggleClass('unpackaging', isUnpackaging);
            this.element.find('.title').html(isUnpackaging ? "Loading " + this.title : this.title);
            this.imageURL += '?' + (new Date()).getTime();
            //console.log(this.imageURL);
            this.element.find('img').attr(
                'src', 
                (isUnpackaging ? 'images/app-loading.gif' : this.imageURL)
            );
        },
    
        checkInstall: function() {
            this.installed = false;
            showChecking(this, "Checking installation (app " + this.id + ")...");
            window.appManager.startAppInstallChecker(this.id);
        },

        install: function() {
            var app = this;
            this.installed = false;
            this.installAttempts++;
            showInstalling(app);
            this.lastInstallCanceled = false;
            window.appManager.startAppInstaller(this.id);
            $(controllerDialog).find('.install-status p').html("Preparing&hellip;");
        },
        
        uninstall: function() {
            appManager.startAppUninstaller(this.id);
        },

        setInstallProgress: function(path, siftID, assetIndex, bytesCompleted, bytesTotal) {
            var d = $(controllerDialog);
            $(controllerDialog).find('.install-status p').html("Installing &hellip;");
            // $(controllerDialog).find('.install-status .progress-text').html(Math.floor(100 * bytesCompleted / bytesTotal) + '% complete');
            $(controllerDialog).find('.install-status .progress-bar').progressbar('value', Math.floor(100 * bytesCompleted / bytesTotal));
        },

        verifyingInstall: function() {
            showChecking(this, "Verifying install...");
        },

        // --- Post-action handlers -------------------------------------------
        // Invoked after an action has occurred, e.g. handleStarted is called 
        // after an app is started.
        
        handleStarted: function() {
            this.startTime = new Date().getTime();
            this.playDuration = 0;
            trackAppEvent(this, 'library-start');
            var d = $(controllerDialog);
            d.find('.playButton, .uninstallButton').hide();
            d.find('.stopButton, .pauseButton').show();
            if (openedApp.isEditable()) {
                d.find('.controls .create .sift-button').siftButton('disable.game-started');
            }
            $('.uninstall').hide();
            mainWindow.resizeLibraryViewHack();
        },
    
        handleStopped: function() {
            var endTime = new Date().getTime();
            this.playDuration += endTime - this.startTime;
            trackAppEvent(this, 'library-stop', {'playDuration': this.playDuration});
            var d = $(controllerDialog);
            d.find('.stopButton, .pauseButton, .unpauseButton').hide();
            d.find('.playButton, .uninstallButton').show();
            if (openedApp.isEditable()) {
                d.find('.controls .create .sift-button').siftButton('enable.game-started');
            }
            $('.uninstall').show();
            // $(controllerDialog).dialog('close');
            $('#confirm-stop-app-dialog').dialog('close');
            mainWindow.resizeLibraryViewHack();
        },
    
        handlePaused: function() {
            var d = $(controllerDialog);
            d.find('.unpauseButton').show();
            d.find('.pauseButton').hide();
            this.pauseTime = new Date().getTime();
            this.playDuration += (this.pauseTime - this.startTime);
            trackAppEvent(this, 'library-pause', {"playDuration": this.playDuration});
            mainWindow.resizeLibraryViewHack();
        },
    
        handleUnpaused: function() {
            this.startTime = new Date().getTime();
            var pauseDuration = this.startTime - this.pauseTime;
            trackAppEvent(this, 'library-resume', {"pauseDuration": pauseDuration});
            var d = $(controllerDialog);
            d.find('.pauseButton').show();
            d.find('.unpauseButton').hide();
            mainWindow.resizeLibraryViewHack();
        },

        handleAppNotInstalled: function() {
            if (this.installAttempts > 0 && !this.lastInstallCanceled) {
                $('#install-error-dialog .app-name').html(this.title);
                $('#install-error-dialog').dialog({
                    modal: true,
                    resizable: false,
                    draggable: false,
                    title: "Installation Error",
                    buttons: {
                        "Ok": function() { $(this).dialog("close"); }
                    }
                });
            }
            $(controllerDialog).find('.controls .game .sift-button, .controls .create .sift-button').siftButton('enable.installing');
            $(controllerDialog).data('installing', false).find('.install-status').hide();
            if (controlDeck.requiredSiftCountIsMet()) {
                showInstallOption(this);
            }
        },
        
        handleAppInstalled: function() {
            this.installAttempts = 0;
            var d = $(controllerDialog);
            d.data('installing', false);
            var hideStatus = function() {
                d.find('.install-status').hide();
            };
            $(controllerDialog).find('.controls .game .sift-button, .controls .create .sift-button').siftButton('enable.installing');
            if (d.data('animating-show-installing')) {
                setTimeout(hideStatus, 1000);
            }
            else {
                hideStatus();
            }
            if (controlDeck.requiredSiftCountIsMet()) {
                d.find(".install-status").hide();
                d.find(".controls .install").hide();
                showGameControls();
            }
        },
        
        handleUninstallerStarted: function() {
            showUninstalling();
            $('.controls .sift-button').siftButton('disable.uninstalling');
        },
        
        handleUninstalled: function() {
            hideUninstalling();
            showInstallOption(this);
            $('.controls .sift-button').siftButton('enable.uninstalling');
            $('.uninstall').hide();
        },
        handleAppNotUninstalled: function(message) {
            hideUninstalling();
            $('#uninstall-error-dialog .app-name').html(this.title);
            $('#uninstall-error-dialog').dialog({
                modal: true,
                resizable: false,
                draggable: false,
                title: "Uninstall Error",
                buttons: {
                    "Ok": function() { $(this).dialog("close"); }
                }
            });
            $('.controls .sift-button').siftButton('enable.uninstalling');
            this.checkInstall();
        },
        
        handleDownloadTimeout: function() {
            // some issues with this at the moment.
            /*
            if (!this.downloadTimeoutBubble) {
                var bubbleContent = Sift.App.getAppErrorBubbleTemplate('<h3 style="margin-top:10px">This is taking too long!</h3>\
                    <p>\
                        We haven\'t heard from our game server for a while.\
                    </p>\
                    <p>\
                        <nobr>You can try to <a class="stop-download-and-try-again" href="#">download this game again</a>.</nobr>\
                    </p>\
                ');
                var bubble = new Sift.Bubble(bubbleContent, {
                    appendTo: $('section.library .apps'),
                    scrollableParent: $('section.app.page'),
                    pointerMargin: 60,
                    strokeWeight:1
                });
                bubble.attach(this.element)
                bubble.show();
                $('a.stop-download-and-try-again', bubble.jqContent).click(function() {
                    appManager.cancelAppDownload(this.id);
                    appManager.downloadRemoteAppsByID([this.id], loggedInUser.getAppsDirPath());
                    Sift.App.remove(this.id);
                    bubble.remove();
                    this.downloadTimeoutBubble = null;
                });
                this.downloadTimeoutBubble = bubble;
            }
            */
        },
        
        
        handleCubesCleared: function() {
            this.checkInstall();
        },

        verifyingInstall: function() {
            showChecking(this, "Verifying install...");
        }
    };

    return SiftAppClass;
}();
