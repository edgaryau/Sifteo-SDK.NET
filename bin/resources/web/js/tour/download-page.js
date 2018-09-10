;(function($) {
    var currentPath = '';
    var currentSegment = 0;
    var currentMovie = 0;

    $(gPageController).bind('pageChanged', function(event, index) {
        var page = $('#download-page');
        if (gPages[index].id == 'download-page') {
            var animContainer = $('.screencap-container', page);
            var animImg = $('img', animContainer);
            var pageCaption = $('.caption', page);
            var label = $('.label', page);
            var movieControls = $('.movie-controls', page);


            var reset = function() {
                pageCaption.hide();
                animContainer.hide();
                label.hide();
                currentPath = '';
                currentSegment = 0;
                currentMovie = 0;
                //console.log('reset');
            };
            
            var movies = [
                {
                    caption:'Siftrunner connects you to the Sifteo Store.',
                    segments: [
                        {
                            path:'images/tour/download-games/click-on-store.gif',
                            time: 3000,
                            label:'Click on the store tab to browse the store.'
                        }
                    ]
                },
                {
                    caption:'Buy some points.',
                    segments: [
                        {
                            path: 'images/tour/download-games/click-on-points.gif',
                            time: 3000,
                            label: 'Click on your points display in the upper right to see your account.'
                        },
                        {
                            path: 'images/tour/download-games/buying-points.gif',
                            time: 3000,
                            label: 'Then fill out the points purchase form.'
                        }
                    ]
                },
                {
                    caption:'Download games with your points.',
                    segments: [
                        {
                            path: 'images/tour/download-games/download-a-game.gif',
                            time: 3000,
                            label: ''
                        },
                        {
                            path: 'images/tour/download-games/play-a-game.gif',
                            time: 3000,
                            label: 'Play a game by clicking on it in "My Games". <br/>You may have to install it onto your cubes the first time you play it.'
                        }
                    ]
                }
            ];
            
            var setImgAnim = function(path, length, callback) {
                movieControls.fadeOut();
                animContainer.fadeOut('fast', function() {
                    currentPath = path;
//                    animImg.remove();
//                    animContainer.append('<img>');
//                    animImg = $('img', animContainer);
                    animImg.attr('src', currentPath);
                    animContainer.fadeIn('fast', pageCallback(function() { 
                        // set again to make sure it starts at the top AFTER fading in.
                        animImg.attr('src', currentPath);
                    }));
                    if (typeof length != 'undefined') {
                        setPageTimeout(function() {
                            movieControls.fadeIn();
                            if (callback) {
                                callback();
                            }
                        }, length);
                    }
                });
            };
/*
            var setImgAnim = function(path, repeat, callback) {
                if (typeof repeat == 'function') {
                    callback = repeat;
                    repeat = false;
                }
                if (repeatInterval > -1) {
                    clearTimeout(repeatInterval);
                    repeatInterval = -1;
                }
                animContainer.fadeOut('fast', function() {
                    currentPath = path;
                    animImg.attr('src', currentPath);
                    animContainer.fadeIn('fast', callback);
                    if (repeat) {
                        repeatInterval = setPageInterval(function() {
                            animContainer.fadeOut('fast', function() {
                                animImg.attr('src', currentPath);
                                animContainer.fadeIn('fast');
                            });
                        }, repeat);
                    }
                });
            };
*/

            var incrementCurrent = function() {
                //console.log('incrementing current');
                if (currentSegment + 1 > movies[currentMovie].segments.length - 1) {
                    if (currentMovie + 1 > movies.length - 1) {
                        currentMovie = 0;
                    }
                    else {
                        currentMovie++;
                    }
                    currentSegment = 0;
                }
                else {
                    currentSegment++;
                }

                if (currentMovie + 1 > movies.length - 1 && currentSegment + 1 > movies[currentMovie].segments.length - 1) {
                    $('.next-step', movieControls).html('Let\'s start over.');
                    showNextBubble();
                }
                else {
                    $('.next-step', movieControls).html('OK. What\'s next?');
                    hideNextBubble();
                }
            };

            var playCurrent = function() {
                //console.log('current movie: ' + currentMovie + ', current segment: ' + currentSegment);
                var movie = movies[currentMovie];
                var segment = movie.segments[currentSegment];
                if ($('p', pageCaption).html() != movie.caption) {
                    animContainer.fadeOut();
                    label.fadeOut();
                    setPageCaption(movie.caption);
                    setPageTimeout(function() {
                        setImgAnim(segment.path, segment.time);
                        label.html(segment.label).fadeIn();
                    }, 2000);
                }
                else {
                    setImgAnim(segment.path, segment.time);
                    label.html(segment.label).fadeIn();
                }
            };
            
            /*
            var playClickOnStore = function() {
                reset();
                setPageCaption('Siftrunner connects you to the Sifteo Store.');
                setPageTimeout(function() {
                    label.html('Click on the store tab to browse the store.').fadeIn();
                    setImgAnim(, 4000);
                    
                    setPageTimeout(function() {
                        label.html();
                        setImgAnim('images/tour/download-games/click-on-points.gif', 4000, function() {
                            setPageCaption('You need points to purchase some games.');
                            setPageTimeout(function() {
                                setImgAnim('');
                                label.html('Then fill out the points purchase form.');
                            }, 8000);
                        });
                    }, 8000);
                }, 2000);
            };
            */
            
            if (!page.data('inited')) {
                page.data('inited', true);
                $('.show-me-again', page).click(function() {
                    playCurrent();
                    return false;
                });
                $('.next-step', page).click(function() {
                    incrementCurrent();
                    playCurrent();
                    return false;
                });
            }
            
            reset();
            setPageCaption(movies[0].caption);
            setPageTimeout(function() {
                playCurrent();
            }, 1000);
        }
        else {
        }
    });
})(jQuery, undefined);