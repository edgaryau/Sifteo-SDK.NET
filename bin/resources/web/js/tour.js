
// --- GLOBALS ------------------------------------------------------------------

var gPages = [];
var gPageController = {};
var gCurrentPage = 0;
var gTransitioningPages = false;

// --- LOGIN FORM ---------------------------------------------------------------
$(document).ready(function() {

    var submitLogin = function() {
        var email = $('#user-session-email').val();
        var password = $("#user-session-password").val();
        try {
            mainController.requestAuthByPassword(email, password);
            $('#new-user-session button').html('logging in&hellip;');
            $('#new-user-session').addClass('disabled');
        }
        catch(e) {
            showAuthErrorMessage('Something went wrong while trying to log you in!');
        }
        return false;
    };

    var disableLoginForm = function() {
        $('#new-user-session input, #new-user-session button').unbind('click').click(function() {
            return false;
        });
        $('#new-user-session').addClass('disabled').submit(function() {
            return false;
        });
    };
    var resetLoginForm = function() {
        $('#new-user-session').removeClass('disabled');
        $('#new-user-session').unbind('submit').submit(submitLogin);
        $('#new-user-session button').html('<span>Log In</span>');
    };
    var showAuthErrorMessage = function(message) {
        $('#new-user-session button').html('<span>Log In</span>');
        $('#auth-error-message div').html(message).slideDown();
        $("#user-session-email, #user-session-password").bind('change.authError', function() {
            $('#authErrorMessage div').slideUp();
            $('#user-session-email, #user-session-password').unbind('change.authError');
        });
    };
    
    mainController.userLoggedIn.connect(function() {
        var name = loggedInUser.getName();
        if (name.length) {
            $('#new-login-greeting .user-name').html(name);
        }
        else {
            $('#new-login-greeting .user-name').html(user.getEmailAddress());
        }
        // this crap is to auto-size the div so it centers.
        // not really necessary with only text, but we can throw in a happy image 
        // if we want and it should still work.
        $('#new-login-greeting').css({
            position: 'absolute',
            left: '-32000px'
        }).show();
        var w = $('#new-login-greeting h3').outerWidth();
        $('#new-login-greeting').css({
            position: 'relative',
            left: '0',
            margin: '0 auto',
            width: (w + 6) + 'px'
        }).slideDown();
        $('#account-page .login').slideUp();
    });

    
    authController.authNetworkFailure.connect(function() {
        console.log('network failure');
        showAuthErrorMessage('There was a problem contacting Sifteo to log you in.');
        resetLoginForm();
    });

    authController.authCredentialsRejected.connect(function () {
        console.log('credentials rejected');
        showAuthErrorMessage('The username or password you entered is incorrect.');
        resetLoginForm();
    });
    resetLoginForm();
});



// --- PAGE NAV ---------------------------------------------------------------

$(document).ready(function() {
    
    var truncateTextTo = function(text, maxLength) {
        var result = text;
        if (text.length > maxLength) {
            result = text.substr(0, maxLength) + '&hellip';
        }
        return result;
    };

    var jqPageElements = $("section").hide().filter(function(i) {
        if ($(this).attr('data-include-when-not-authenticated')) {
            return (loggedInUser === null);
        }
        else {
            return true;
        }
    });
    jqPageElements.each(function(i) {
        var jqPage = $(this);
        var page = {
            title: jqPage.find('h2').html(),
            id: jqPage.attr('id'),
            useNav: (jqPage.attr('data-use-nav') != 'false'),
            jElement: jqPage,
            data: {},
            timers: []
        };
        gPages.push(page);
        if (i > 0) {
            $('#breadcrumbs').append('<li data-page-index=\'' + i + '\' data-page-title=\'' + page.title.replace("'", "\'") + '\' data-page-id=\'' + page.id + '\'></li>');
            $('#' + page.id + ' header h2')
                .html(i + '. ' + page.title);

        }
        $(this).show();
    });
    
    $('#breadcrumbs li').each(function() {
        var title = $(this).attr('data-page-title');
        var width = 20 + (8 * title.length);  // cheeze whiz!
        var content = '\
            <div style="width:' + width +  'px;padding:14px 10px 10px;text-align:center;">\
                ' + title + '\
            </div>\
        ';
        var bubble = new Sift.Bubble(content, {
            showOnHover: true,
            preserveHoverOnBubble: false,
            closeButton: false,
            pointerSize:8,
            radius:5,
            fadeOutSpeed: 0,
            shadowSize: 3,
            shadowWeight:0.2
        });
        bubble.attach(this);
    });
    
    $(gPageController).bind('pageChanged', function(event, index) {
        $('#breadcrumbs li')
            .removeClass('active')
            .eq(index - 1)
                .addClass('active');
    });


    //var callbacks = [];
    // wrap completion callbacks to, eg, jQuery.animate to prevent
    // them from firing when the page has changed.
    window.pageCallback = function(f) {
        if (f) {
            //console.log('setting callback ' + callbacks.length + '; page at set time: ' + gCurrentPage);
            return (function(pageAtSetTime, callbackIndex) {
                var wrappedFunc = function() {
                    if (!gTransitioningPages && pageAtSetTime == gCurrentPage) {
                        //console.log('---> invoking callback ' + callbackIndex + '; current page: ' + gCurrentPage + ', page at set time: ' + pageAtSetTime);
                        f();
                    }
                    else {
                        //console.log('---> not triggering callback ' + callbackIndex + '; current page: ' + gCurrentPage + ', page at set time: ' + pageAtSetTime);
                    }
                };
                //callbacks.push(wrappedFunc);
                return wrappedFunc;
            })(gCurrentPage/*, callbacks.length*/);
        }
        return f;   // probably undefined, which is ok
    };
    
    // set a timeout that will be automatically canceled when the page changes
    window.setPageTimeout = function(f, timeout, method) {
        var methodName;
        if (!method) {
            method = setTimeout;
            methodName = 'timeout';
        }
        else {
            method = setInterval;
            methodName = 'interval';
        }
        if (!gTransitioningPages) {
            var t = method((function(pageAtSetTime, index, methodName) { 
                return function() {
                    var timerID = gPages[pageAtSetTime].timers[index];
                    var methodID = methodName + ' ' + timerID;
                    if (gCurrentPage == pageAtSetTime && !gTransitioningPages) { 
                        //console.log(' ----------- > executing ' + methodID + '. ' + gCurrentPage + ', ' + pageAtSetTime);
                        f(); 
                        //console.log(' ----------- > execution of ' + methodID + ' done. ');
                    } 
                    else { 
                        if (gTransitioningPages) {
                            //console.log(' XXX transitioning pages; not triggering ' + methodID);
                        }
                        else {
                            //console.log(' XXX page changed since setting; not triggering ' + methodID);
                        }
                    }
                };
            })(gCurrentPage, gPages[gCurrentPage].timers.length, methodName), timeout);
            //console.log('set ' + methodName + ' ' + t + ' for page ' + gCurrentPage);
            gPages[gCurrentPage].timers.push(t);
            return t;
        }
        //console.log('transitioning pages; not setting ' + methodName);
        return -1;
    };
    window.setPageInterval = function(f, timeout) {
        return setPageTimeout(f, timeout, setInterval);
    };

    window.showNextBubble = function() {
        if (!$('nav').data('nextBubble')) {
            var nextButton = $('nav li.next');
            var b = new Sift.Bubble('<p style="color:#333333;width:170px; padding:14px 0px 0px 0px;text-align:center;">Click to continue.</p>', {
                closeButton: false,
                pointerSize:10,
                radius:5,
                fadeOutSpeed: 0,
                shadowSize: 3,
                shadowWeight:0.2
            });
            b.attach(nextButton);
            $(gPageController).bind('pageChanged', function(event, index) {
                b.hide();
            });
            b.getContainer().css('cursor', 'pointer').click(function() {
                goToNextPage();
            });
            $('nav').data('nextBubble', b);
        }
        var bubble = $('nav').data('nextBubble');
        
        // var blink = {
        //     top: { r: 255, g: 226, b: 191 },    // hsb = 33, 25, 100
        //     bottom: { r: 255, g: 197, b: 128 }  // hsb = 33, 50, 100
        // };
        var blink = {
            top: { r: 191, g: 231, b: 255 },    // hsb = 203, 25, 100
            bottom: { r: 128, g: 207, b: 255 }  // hsb = 203, 50, 100
        };
        var gray = {
            top: { r: 255, g: 255, b: 255 },
            bottom: { r: 220, g: 220, b: 220 }
        };
        
        var ctx = bubble.getCanvasContext();
        var dimensions = bubble.getContentDimensions();
        var t = 0.05;
        var d = 0.05;
        setPageInterval(function() {
            var g = ctx.createLinearGradient(0, 0, 0, dimensions.outerHeight);
            var top = {
                r: Math.round(gray.top.r + t * (blink.top.r - gray.top.r)),
                g: Math.round(gray.top.g + t * (blink.top.g - gray.top.g)),
                b: Math.round(gray.top.b + t * (blink.top.b - gray.top.b))
            };
            var bottom = {
                r: Math.round(gray.bottom.r + t * (blink.bottom.r - gray.bottom.r)),
                g: Math.round(gray.bottom.g + t * (blink.bottom.g - gray.bottom.g)),
                b: Math.round(gray.bottom.b + t * (blink.bottom.b - gray.bottom.b))
            };
            g.addColorStop(0, 'rgb(' + top.r  + ',' + top.g + ',' + top.b + ')');
            g.addColorStop(1, 'rgb(' + bottom.r  + ',' + bottom.g + ',' + bottom.b + ')');
            bubble.setGradient(g);
            bubble.redraw();
            if (t >= 1 || t <= 0) {
                d *= -1;
            };
            t += d;
        }, 30);
/*
 * thar be blinking code here 
        var blinkGradient = bubble.getCanvasContext().createLinearGradient(0, 0, 0, bubble.getContentDimensions().outerHeight);
        //blinkGradient.addColorStop(0, 'rgb(255,139,0)');
        //blinkGradient.addColorStop(1, 'rgb(255,78,0)');
        blinkGradient.addColorStop(0, 'rgb(0,160,241)');
        blinkGradient.addColorStop(1, 'rgb(0,125,201)');
        var origGradient = bubble.getGradient();
        var blinkOn = false;
        setPageInterval(function() {
            if (blinkOn) {
                bubble.getContent().find('p').css('color', '#333333');
                bubble.setGradient(origGradient);
                bubble.redraw();
                blinkOn = false;
                console.log('blink off');
            }
            else {
                bubble.getContent().find('p').css('color', '#ffffff');
                bubble.setGradient(blinkGradient);
                bubble.redraw();
                blinkOn = true;
                console.log('blink on');
            }
        }, 800);
*/
        $('nav').data('nextBubble').show();
        $(window).resize(function() {
            var b = $('nav').data('nextBubble');
            if (b && b.isVisible()) {
                b.reposition();
            }
        });
    };

    window.hideNextBubble = function() {
        if ($('nav').data('nextBubble')) {
            $('nav').data('nextBubble').hide();
        }
    };

    window.setPageCaption = function(html) {
        var captionContainer = $('.caption.top', gPages[gCurrentPage].jElement);
        var caption = $('p', captionContainer);
        captionContainer.fadeOut('fast', function() {
            caption.html(html);
            captionContainer.fadeIn('fast');
        });
    };


    var goToPage = function(index) {
        if (index >= 0 && index < gPages.length) {
            //console.log('entering goToPage');
            gTransitioningPages = true;
            var left = $('#container').css('left');
            var w = $(window).width();
            $("section.page").removeClass("scrollable");
            prevJPageElement = gPages[gCurrentPage].jElement;
            $('#container').animate({ left: -1 * w * index }, function() {
                $("section.page").addClass("scrollable");
                layout();
                prevJPageElement.scrollTop(0);                
            });

            // clear timers
            $.each(gPages[gCurrentPage].timers, function(i, timer) {
                //console.log('clearing timer ' + timer);
                clearInterval(timer);
                clearTimeout(timer);
            });
            gPages[gCurrentPage].timers = [];

            gCurrentPage = (typeof index == 'number' ? index : parseInt(index, 10));
            
            if (gPages[gCurrentPage].useNav) {
                $('nav').slideDown(layout);
            }
            else {
                $('nav').slideUp(layout);
            }
            centerCurrentPage();
            gTransitioningPages = false;
            //console.log('exiting goToPage');
            //console.log('triggering pageChanged ' + gCurrentPage);
            $(gPageController).trigger('pageChanged', [gCurrentPage]);
        }

    };
    
    var goToNextPage = function() {
        goToPage(gCurrentPage + 1);
    };
    var goToPrevPage = function() {
        goToPage(gCurrentPage - 1);
    };
    var layout = function() {
        var screenWidth = $(window).width();
        var screenHeight = $(window).height();
        var currentLeft = $('#container').position().left;
        var totalWidth = 0;
        var firstSection = $('section').eq(0);
        var prevSectionWidth = firstSection.outerWidth();
        $('section').each(function() {
            $(this).width(screenWidth - parseInt($(this).css('padding-right'), 10) * 2);
            totalWidth += $(this).outerWidth();
            //$('img', this).
        });
        var delta = prevSectionWidth - firstSection.outerWidth();
        $('#container').width(totalWidth).css('left', currentLeft + (delta * gCurrentPage));
        if($("nav").is(":visible")) {
            pageHeight = screenHeight - $("nav").outerHeight();
        } else {
            pageHeight = screenHeight;
        }
        //console.log([screenHeight, pageHeight])
        $('section').height(pageHeight);
        $('body').width(screenWidth);
        $(gPageController).trigger('layoutChanged');
    };

    var centerVertically = function(element, extra) {
        /*jsl:ignore*/
        var extra = extra || 160;
        /*jsl:end*/
        var minimum = 40;
        var content = $(element);
        var page = content.parent('section.page');
        var headerHeight = $('header', page).outerHeight();
        var contentHeight = content.outerHeight();
        var navHeight;
        if ($('nav:animated').length > 0) {
            navHeight = 93;     // hard-coded ... will need to update by hand if nav height changes
        }
        else {
            navHeight = $('nav').outerHeight();
        }
        var margin = minimum;
        if (contentHeight > window.outerHeight - headerHeight - navHeight - extra) {
            content.css('margin-top', margin);
        }
        else {
            margin = Math.max((window.outerHeight - headerHeight - contentHeight - navHeight - extra) / 2, minimum);
            content.css('margin-top', Math.max(margin, minimum));
        }
        //var captionMargin = Math.max(content.offset().top - margin / 2, 90);
        var captionMargin = (content.offset().top - margin / 2) - 10;
        //console.log(captionMargin);
        $('.caption.top').css('top', captionMargin);
    };
    
    var centerCurrentPage = function() {
        var jqCenteredContent = $('.centered', gPages[gCurrentPage].jElement);
        if (jqCenteredContent.length) {
            centerVertically(jqCenteredContent);
        }
    };
        
    $(window).resize(function() {
        centerCurrentPage();
    });

    $('a.prev-button').click(function() {
        goToPrevPage();
    });
    $('a.next-button, a.next').click(function() {
        goToNextPage();
    });
    $('#breadcrumbs li').each(function() {
        $(this).click(function() {
            goToPage($(this).attr('data-page-index'));
        });
    });

    $(gPageController).bind('pageChanged', function(event, index) {
        if (gPages.length > index + 1) {
            $('.next-button').not('.static-text')
                .html('<span>' + truncateTextTo(gPages[index + 1].title, 20) + ' &rarr;</span>')
                .removeClass('invisible all-done');
        }
        else {
            $('.next-button').not('.static-text')
                .html('All Done!')
                .addClass('all-done');
        }
        if (index - 1 >= 0) {
            $('.prev-button').not('.static-text')
                .html('<span>&larr; ' + truncateTextTo(gPages[index - 1].title, 20) + '</span>')
                .removeClass('invisible');
        }
        else {
            $('.prev-button').not('.static-text')
                .html('<span>Back</span>')
                .addClass('invisible');
        }
    });

    
    $('.exit-link').click(function() {
        $('body').fadeOut(function() {
            mainWindow.exitTour();
        });
        return false;
    });
    
    var inputHasFocus = false;
    $('input').focus(function() {
        inputHasFocus = true;
    }).blur(function() {
        inputHasFocus = false;
    });
    $(window).keydown(function(event) {
        var notHandled = true;
        if (!inputHasFocus) {
            switch (event.which) {
                case 39: // right arrow
                    goToNextPage();
                    notHandled = false;
                break;
                case 37: // left arrow
                    goToPrevPage();
                    notHandled = false;
                break;
                case 9: // tab
                    // prevent tabbing to inputs
                    // (will still tab when an input has focus; may need to be revisited if inputs 
                    // wind up on multiple pages.)
                    return false;
                break;
                default:
                break;
            }
        }
        return notHandled;
    });
    

    if (typeof prefsController != 'undefined') {
        if (prefsController.getPref('app-controls/showTourOnLaunch') > 0) {
            $('.show-tour-checkbox input').attr('checked', 'checked');
        }
        else {
            $('.show-tour-checkbox input').removeAttr('checked');
        }
        $('.show-tour-checkbox').change(function() {
            if ($(':checked', this).length) {
                prefsController.setPref('app-controls/showTourOnLaunch', 1);
                $('.show-tour-checkbox input').attr('checked', 'checked');
            }
            else {
                prefsController.setPref('app-controls/showTourOnLaunch', 0);
                $('.show-tour-checkbox input').removeAttr('checked');
            }
        });
    }
    
    // Start cycler slideshow
/*
    $(".slideshow").each(function() {
        $(this).cycle({ 
            fx: 'fade',
            timeout: 6000, 
            pause: 1,
            next: this
        }).cycle('pause');
    });
    
    $(gPageController).bind('pageChanged', function(event, index) {
        // pause all slideshows != this one
        $(".slideshow").each(function() {
            $(this).cycle(0).cycle('pause');
        })
        // start this one if there is one.
        $(".page:visible")
            .eq(index)
                .find(".slideshow")
                    .cycle('resume');
    });
*/

    
    // set up initial state
    $(window).resize(layout);
    layout();
    goToPage(0);
    $('a').attr('tabIndex', '-1');
    $('body').fadeIn();
});