;(function($) {

    $(gPageController).bind('pageChanged', function(event, index) {
        var page = $('#on-off-page');
        if (gPages[index].id == 'on-off-page') {

            if (!page.data('animations-inited')) {
                //console.log('initing animations');
                page.data('animations-inited', true);
                var finger = $('.finger', page);
                var boink = $('.boink', page);
                var onOffDiagram = $('.on-off-diagram');
                //var caption = $('.on-off-diagram .caption', page);
                var caption = $('.caption.top', page);
                var clock = $('.clock', page);
                var clockCaption = $('.clock-caption', page);
                var hand = $('.hand', page);
                var dock = $('.dock', page);
                var batteryCube = $('.battery-cube', page);
                var batteryStates = $('.battery-states', page);
                var batteryStatesCaption = $('.battery-states-caption', page);
                var batteryStatesCaptionLine = $('.battery-states-caption-line', page);
                var screenCanvas = $('canvas.screen', page);
                var chargingDiagram = $('.charging-diagram', page);
                var screenCtx = screenCanvas.get(0).getContext('2d');
                var boinkTimer = -1;
                var clockInterval = -1;

                var colorScreen = function(color) {
                    offset = finger.hasClass('pushing') ? 3 : 0;
                    screenCtx.clearRect(0, 0, screenCanvas.outerWidth(), screenCanvas.outerHeight());
                    screenCtx.beginPath();
                    screenCtx.moveTo(5, 35 + offset);
                    screenCtx.lineTo(50, 12 + offset);
                    screenCtx.lineTo(113, 27 + offset);
                    screenCtx.lineTo(70, 51 + offset);
                    screenCtx.closePath();
                    screenCtx.fillStyle = color;
                    screenCtx.fill();
                };
                
                var showBoink = function() {
                    boinkTimer = setPageInterval(function() {
                        if (!boink.data('rotated')) {
                            boink.css({ left: -4, '-webkit-transform': 'rotate(20)' });
                            boink.data('rotated', true);
                            colorScreen('#555588');
                        }
                        else {
                            boink.css({ left: 0, '-webkit-transform': 'rotate(-20)' });
                            boink.data('rotated', false);
                            colorScreen('#555555');
                        }
                    }, 200);
                    boink.show();
                };
                var hideBoink = function() {
                    colorScreen('#222222');
                    clearInterval(boinkTimer);
                    boink.hide();
                };
                var showClock = function() {
                    var ctx = clock.get(0).getContext('2d');
                    clock.attr('width', 45);
                    var ratio = 0;
                    if (clockInterval != -1) {
                        clearInterval(clockInterval);
                    }
                    var drawOutline = function() {
                        ctx.beginPath();
                        ctx.arc(21, 21, 20, 0, Sift.circleInRadians, true);
                        ctx.closePath();
                        ctx.strokeStyle = 'rgba(0, 0, 0, .9)';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    };
                    var drawClockHand = function(ratio) {
                        ctx.save();
                        ctx.translate(21, 21);
                        ctx.rotate(Math.PI / -2);
                        ctx.beginPath();
                        ctx.arc(0, 0, 19, 0, Sift.circleInRadians * ratio, false);
                        ctx.lineTo(0, 0);
                        ctx.lineTo(-21, 0);
                        ctx.closePath();
                        ctx.fillStyle = '#0090CC';
                        ctx.fill();

                        ctx.restore();
                    };
                    clockInterval = setPageInterval(function() {
                        ratio = ratio + 0.02;
                        clock.attr('width', 45);
                        drawOutline();
                        drawClockHand(ratio);
                        if (ratio >= 1) {
                            clearInterval(clockInterval);
                        }
                    }, 33);
                    clockCaption.fadeIn();
                };
                var hideClock = function() {
                    var ctx = clock.get(0).getContext('2d');
                    clockCaption.fadeOut();
                    clock.attr('width', 45);
                };
                var playTurnOnSequence = function() {
                    reset();
                    //console.log('playTurnOnSequence');
                    onOffDiagram.fadeIn(400, pageCallback(function() {
                        setPageCaption('Press to turn ON and OFF.');
                        
                        setPageTimeout(function() {
                            caption.fadeIn();
                            finger.fadeIn().animate({ top: 80 }, 1000, pageCallback(function() {
                                finger.addClass('pushing');
                                showBoink();
                                setPageTimeout(function() {
                                    finger.removeClass('pushing');
                                    finger.animate({ top: 0 }, 1000, pageCallback(function() {
                                        setPageTimeout(function() {
                                            finger.animate({ top: 80 }, 1000, function() {
                                                finger.addClass('pushing');
                                                showClock();
                                                setPageTimeout(function() {
                                                    hideBoink();
                                                    finger.removeClass('pushing');
                                                    colorScreen('#222222');
                                                    finger.animate({ top: 0 }, 1000, function() { 
                                                        hideClock();
                                                        finger.fadeOut();
                                                        setPageTimeout(function() {
                                                            onOffDiagram.fadeOut(400, pageCallback(playBatterySequence));
                                                        }, 1000);
                                                    });
                                                }, 2000);
                                            });
                                        }, 1000);
                                    }));
                                }, 300);
                            }));
                        }, 1500);
                    }));
                };

                var playBatterySequence = function() {
                    hand.hide();
                    dock.hide();
                    setPageCaption('Your cubes are powered by love! (And batteries.)');

                    $('.battery-cube-container').css('left', 0);
                    batteryStates.removeClass().addClass('anim battery-states full').fadeIn();
                    chargingDiagram.fadeIn();
                    setPageTimeout(function() {
                        batteryStatesCaption.html('Fully charged!').fadeIn();
                        batteryStatesCaptionLine.fadeIn();

                        setPageTimeout(function() {
                            batteryStates.removeClass('full').addClass('discharging');
                            batteryStatesCaption.html('Doing OK!');
                            setPageTimeout(function() {
                                batteryStates.removeClass('discharging').addClass('empty');
                                batteryStatesCaption.html('Needs charging!');
                                setPageTimeout(function() {
                                    $('.battery-cube-container').animate({ left: -100 }, 1000, pageCallback(function() {
                                        playChargeAnim(function() {
                                            batteryStates.removeClass('empty').addClass('docked-charging');
                                            batteryStatesCaption.html('Recharging!');
                                            setPageTimeout(function() {
                                                batteryStates.removeClass('docked-charging').addClass('docked-full');
                                                batteryStatesCaption.html('Ready to Go!');
                                                setPageTimeout(function() {
                                                    hand.fadeOut();
                                                    dock.fadeOut();
                                                    caption.fadeOut();
                                                    $('.battery-cube-container').animate({ left: 0 }, 1000, function() {
                                                        setPageTimeout(function() {
                                                            chargingDiagram.fadeOut(400, pageCallback(function() {
                                                                showNextBubble();
                                                                playTurnOnSequence();
                                                            }));
                                                        }, 2000);
                                                    });
                                                }, 2000);
                                            }, 2000);
                                        });
                                    }));
                                }, 1000);
                            }, 2000);
                        }, 2000);

                    }, 2000);
                };

                var playChargeAnim = function(callback) {
                    hand.css('top', 20);
                    dock.addClass('empty');
                    hand.removeClass('empty');
                    hand.fadeIn();
                    dock.fadeIn();
                    hand.animate({ top: 85 }, 1000, pageCallback(function() {
                        dock.removeClass('empty');
                        hand.addClass('empty');
                        setPageTimeout(function() {
                            hand.fadeOut();
                            setPageTimeout(callback, 1000);
                        }, 1500);

                    }));
                };
                
                var reset = function() {
                    caption.hide();
                    hideBoink();
                    finger.hide().css({ top: 0 }).removeClass('pushing');
                    chargingDiagram.hide();
                    hand.hide();
                    dock.hide();
                    batteryStatesCaption.hide();
                    batteryStatesCaptionLine.hide();
                    hideClock();
                    boink.hide();
                };
                
                page.data('anim', {
                    playTurnOnSequence: playTurnOnSequence,
                    reset: reset
                });


            }

            page.data('anim').reset();
            page.data('anim').playTurnOnSequence();
        }
        else {
            if (page.data('anim')) {
                page.data('anim').reset();
            }
        }
    });
})(jQuery, undefined);