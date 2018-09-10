;(function($) {

    $(gPageController).bind('pageChanged', function(event, index) {
        var page = $('#welcome-page');
        if (gPages[index].id == 'welcome-page') {
            var winniBig = $('.winni-big', page);
            var winniSmall = $('.winni-small', page);
            setPageTimeout(function() {
                /*
                 * on windows this rotation draws with an ugly artifact.
                 * taking out entirely for now.
                 * 
                setPageTimeout(function() {
                    var deg = 0;
                    var increasing = true;
                    setPageInterval(function() {
                        winniBig.css('-webkit-transform', 'rotate(' + deg + 'deg)');
                        if (increasing) {
                            deg += 1;
                        }
                        else {
                            deg -= 1;
                        }
                        if (deg <= -10) {
                            deg = -10;
                            increasing = true;
                        }
                        else if (deg >= 10) {
                            deg = 10;
                            increasing = false;
                        }
                    }, 30);
                }, 800);
                */
                winniBig.css('cursor', 'pointer').click(function() {
                    winniBig.animate({ top: 100 }, 'fast', pageCallback(function() {
                        winniBig.animate({ top: 240 }, 'fast');
                    }));
                });
                winniBig.fadeIn().animate({ top: 240 }, pageCallback(function() {
                    if (!page.data('welcome-bubble')) {
                        var content = '<p style="padding:20px; padding-bottom:2px;font-size:16px;">Welcome to Sifteo!</p>';
                        var bubble = new Sift.Bubble(content, {
                            showOnHover: true,
                            preserveHoverOnBubble: false,
                            closeButton: false,
                            pointerSize:16,
                            radius:5,
                            fadeOutSpeed: 0,
                            shadowSize: 3,
                            shadowWeight:0.2,
                            gradientStartColor: 'rgb(255, 255, 255)',
                            gradientStopColor: 'rgb(255, 255, 255)'
                        });
                        bubble.attach(winniBig);
                        page.data('welcome-bubble', bubble);
                    }
                    page.data('welcome-bubble').show();
                }));
            }, 1000);
        }
        else {
            if (page.data('welcome-bubble')) {
                page.data('welcome-bubble').hide();
            }
        }
    });

})(jQuery, undefined);