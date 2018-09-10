;(function($) {

    $(gPageController).bind('pageChanged', function(event, index) {
        var page = $('#link-page');
        if (gPages[index].id == 'link-page') {
            var netbook = $('.netbook', page);
            var hand = $('.hand', page);
            var dongle = $('.dongle', page);
            var waveCanvas = $('.dongle-waves', page);
            var dongleRange = 130;
            var dongleGradient = waveCanvas.get(0).getContext('2d').createRadialGradient(0, 0, 0, 0, 0, dongleRange);
            var plugInDiagram = $('.plug-in-diagram', page);
            var linkDiagram = $('.link-diagram', page);
            var storageDiagram = $('.storage-diagram');
            var caption = $('.caption', page);
            var linkStatesCaption = $('.link-states-caption', page);
            var linkStatesIcons = $('.link-states-icons', page);
            dongleGradient.addColorStop(0, 'rgba(198, 222, 137, 1)');
            dongleGradient.addColorStop(1, 'rgba(198, 222, 137, 0)');

            var getVectorMagnitude = function(vector) {
                return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
            };

            var getAngleAndMagnitudeFromVector = function(v) {
                if (v.x === 0 && v.y === 0) {
                    return {
                        angle: 0,
                        magnitude: 0
                    };
                }
                return {
                    angle: Math.atan(v.y / v.x) * Sift.radToDegFactor,
                    magnitude: getVectorMagnitude(v)
                };
            };            

            var attachWaves = function(jqElement) {
                
                var ctx = waveCanvas.get(0).getContext('2d');

                jqElement.data('waves', []);
                jqElement.data('waves').unshift(0);

                if (!waveCanvas.data('waving-elements')) {
                    waveCanvas.data('waving-elements', []);
                }

                waveCanvas.data('waving-elements').push(jqElement);

                if (!waveCanvas.data('timer')) {
                    waveCanvas.data('timer', setPageTimeout(function() {
                        ctx.clearRect(0, 0, waveCanvas.outerWidth(), waveCanvas.outerHeight());
                        var dongleIndex = waveCanvas.data('waving-elements').indexOf(dongle);
                        if (dongleIndex > -1) {
                            var origin = dongle.position();
                            origin.left += (dongle.outerWidth() / 2);
                            origin.top += (dongle.outerHeight() / 2);
                            ctx.save();
                            ctx.translate(origin.left, origin.top);
                            ctx.scale(1.4, 0.6);
                            ctx.fillStyle = dongleGradient;
							if (waveCanvas.outerWidth() > 0 && waveCanvas.outerHeight() > 0) {
								// interestingly, this triggers an assert on windows that the path is empty if the rect is empty
								ctx.fillRect(-waveCanvas.outerWidth(), -waveCanvas.outerHeight(), waveCanvas.outerWidth() * 2, waveCanvas.outerHeight() * 2);
                            }
							ctx.restore();
                            
                        }
                        
                        var nElementsWithWaves = 0;
                        $.each(waveCanvas.data('waving-elements'), function(index, jqElement) {
                            var range, startAngle, endAngle, rotation;
                            var origin = jqElement.position();
                            
                            if (jqElement == dongle) {
                                range = dongleRange;
                                startAngle = -Math.PI / 2;
                                endAngle = Math.PI;
                                rotation = 0;
                            }
                            else {
                                range = 50;
                                startAngle = -(Math.PI / 4) ;
                                endAngle = Math.PI / 4;
                                
                                if (!jqElement.data('blah')) {
                                    jqElement.data('blah', true);
                                }

                                rotation = Math.atan2(dongle.position().top - origin.top, dongle.position().left - origin.left);
                            }

                            origin.left += (jqElement.outerWidth() / 2);
                            origin.top += (jqElement.outerHeight() / 2);
                            
                            var waves = jqElement.data('waves');

                            ctx.save();
                            ctx.translate(origin.left, origin.top);
                            ctx.rotate(rotation);
                            for (var i = 0; i < waves.length; i++) {
                                ctx.beginPath();
                                ctx.arc(0, 0, waves[i], startAngle, endAngle);
                                ctx.strokeStyle = 'rgba(20, 20, 20, ' + (1 - (waves[i] / range)) + ')';
                                ctx.stroke();
                            }
                            ctx.restore();

                            var removeIndex = -1;
                            for (i = 0 ; i < waves.length; i++) {
                                waves[i] += 1;
                                if (waves[i] > range) {
                                    removeIndex = i;
                                }
                            }
                            if (removeIndex >= 0) {
                                waves.splice(removeIndex);
                            }
                            if (waves.length) {
                                nElementsWithWaves++;
                            }
                        });
                        
                        // automatically stop animating when there are no more waves
                        if (nElementsWithWaves) {
                            setPageTimeout(arguments.callee, 30);
                        }
                        else {
                            waveCanvas.data('timer', false);
                        }
                        
                        if (dongleIndex > -1) {
                            if (waveCanvas.data('sweep-dongle-range') > -1) {
                                var angle = waveCanvas.data('sweep-dongle-range');
                                ctx.save();
                                ctx.translate(origin.left, origin.top);
                                ctx.rotate(waveCanvas.data('sweep-dongle-range') - (Math.PI / 2));
                                ctx.beginPath();
                                ctx.moveTo(0, 0);
                                ctx.lineTo(40, 0);
                                ctx.moveTo(100, 0);
                                ctx.lineTo(dongleRange, 0);
                                ctx.fillStyle = '#444444';
                                ctx.strokeStyle = 'orange';
                                ctx.lineWidth = 3;
                                ctx.stroke();
                                ctx.font = '15px sans-serif';
                                ctx.fillText('5 feet', 50, 0);
                                if (angle > (3 * Math.PI / 2)) {
                                    waveCanvas.data('sweep-dongle-range', -1);
                                }
                                else {
                                    waveCanvas.data('sweep-dongle-range', angle + 0.05);
                                }
                                ctx.restore();
                            }
                        }
                    }), 30);
                }

                jqElement.data('wavePushTimer', setPageInterval(function() {
                    jqElement.data('waves').unshift(0);
                }, 800));
            };
            
            var detachWaves = function(jqElement) {
                clearInterval(jqElement.data('wavePushTimer'));
            };
            
            
            var sweepDongleRange = function() {
                waveCanvas.data('sweep-dongle-range', 0);
            };
            
            var reset = function() {
                if (waveCanvas.data('waving-elements')) {
                    var elements = waveCanvas.data('waving-elements');
                    for(var i = 0; i < elements.length; i++) {
                        detachWaves(elements[i]);
                    }
                }
                waveCanvas.data('waving-elements', []);
                clearTimeout(waveCanvas.data('timer'));
                waveCanvas.data('timer', false);
                waveCanvas.get(0).getContext('2d').clearRect(0, 0, waveCanvas.outerWidth(), waveCanvas.outerHeight());
                dongle.hide();
                $('.cube', page).hide();
                plugInDiagram.css({
                    left: ($('.centered', page).innerWidth() / 2) - (plugInDiagram.outerWidth() / 2)
                }).hide();
                hand.hide().removeClass('no-dongle')
                    .addClass('with-dongle')
                    .css({ left: 200, top: 170 });
                setPageCaption('Your link wirelessly connects your cubes to your computer.');
                caption.hide();
                linkDiagram.hide();
                storageDiagram.hide();
                linkStatesCaption.html('Not Connected');
                linkStatesIcons.removeClass('connected').addClass('disconnected');
                netbook.show();
            };
            
            var plugInLink = function() {
                reset();
                caption.fadeIn();
                plugInDiagram.fadeIn();
                setPageTimeout(function() {
                    hand.fadeIn().animate({ left: 180, top: 165 }, 2000, pageCallback(function() {
                        dongle.css({ left:183, top:162 }).show();
                        hand.removeClass('with-dongle').addClass('no-dongle');
                        hand.fadeOut();
                        attachWaves(dongle);
                        setPageTimeout(function() {
                            var cubes = $('.cube', page);
                            cubes.fadeIn();
                            $(cubes[0]).css({ left: 150, top: 230 });
                            $(cubes[1]).css({ left: 270, top: 180 });
                            $(cubes[2]).css({ left: 240, top: 250 });
                            cubes.each(function() { attachWaves($(this)); });
                            setPageTimeout(function() {
                                setPageCaption('Your cubes work best when they are within 5 feet of the link.');
                                setPageTimeout(sweepDongleRange, 1000);
                                var strayCube = $(cubes[1]);
                                setPageTimeout(function() {
                                    strayCube.animate({ left: 300, top: 40 }, 2000, pageCallback(function() {
                                        strayCube.removeClass('happy').addClass('unhappy');
                                        detachWaves(strayCube);
                                        setPageTimeout(function() {
                                            setPageCaption('Your cubes will tell you when they are out of range.');
                                            setPageTimeout(function() {
                                                plugInDiagram.animate({ left: 0 }, 1000, pageCallback(function() {
                                                    linkDiagram.fadeIn();
                                                    setPageTimeout(function() {
                                                        setPageCaption('And when they are back in range again.');
                                                        setPageTimeout(function() {
                                                            strayCube.animate({ left: 270, top: 180 }, 1000, function() {
                                                                strayCube.removeClass('unhappy').addClass('happy');
                                                                attachWaves(strayCube);
                                                                linkStatesCaption.html('Connected');
                                                                linkStatesIcons.removeClass('disconnected').addClass('connected');
                                                                setPageTimeout(function() {
                                                                    plugInDiagram.fadeOut();
                                                                    linkDiagram.fadeOut();
                                                                    setPageCaption('You can store your link in your dock.');
                                                                    setPageTimeout(function() {
                                                                        storageDiagram.fadeIn();
                                                                        setPageTimeout(function() {
                                                                            storageDiagram.fadeOut(pageCallback(function() {
                                                                                plugInLink();
                                                                                showNextBubble();
                                                                            }));
                                                                        }, 6000);
                                                                    }, 2000);
                                                                }, 2000);
                                                                
                                                            });
                                                        }, 2000);
                                                    }, 4000);
                                                }));
                                            }, 2000);
                                        }, 3000);
                                    }));
                                }, 4000);
                            }, 3000);
                        }, 2000);
                    }));
                }, 2000);
            };
            
            var showDockHint = function() {
                $('nav').before('\
                    <div id="mg-skinner-container" style="position:absolute; left:20px; bottom:80px;width:400px;">\
                        <img id="mg-skinner" src="images/tour/mg-skinner-100px.png" style="position:absolute;"/>\
                        <img id="mg-skinner-bubble" src="images/tour/long-bubble.png" style="display:none; position:absolute; left:100px; top:-20px;"/>\
                        <p id="mg-q-mark" style="display:none; color:#555555; position:absolute; left:115px; top:-9px; font-size:14px; line-height:16px;">\
                            You can store your link in your dock.<br/><a id="reveal-dock-storage" href="#">Click here to see how</a>!\
                        </p>\
                    </div>\
                    <div id="revealed-container" style="position:relative; display:none; padding:10px; z-index:20; width:656px; margin:50px auto;">\
                        <div style="border:3px solid #333333; width:650px; background:#ffffff; border-radius:10px; ">\
                            <img src="images/tour/dongle-storage.png" />\
                            <p style="text-align:center;">\
                            </p>\
                        </div>\
                    </div>\
                ');
                setPageTimeout(function() {
                    $('#mg-skinner-container').animate({ bottom: '180px' }, 'fast', 'swing', pageCallback(function() {
                        $('#mg-skinner-bubble, #mg-q-mark').fadeIn();
                        $('#reveal-dock-storage').click(function() {
                            $('#revealed-container').fadeIn();
                            $('#pageSet').animate({ opacity: 0.2 }, 'fast');
                            $('body').bind('click.dismiss', function() {
                                $('#revealed-container').fadeOut();
                                $('#pageSet').animate({ opacity: 1 }, 'fast');
                                $('body').unbind('click.dismiss');
                            });
                            return false;
                        });
                    }));
                }, 500);

            };
            
            plugInLink();
            
            // if (page.data('visited-and-left')) {
            //     showDockHint();
            // }
            
            if (!page.data('visited')) {
                page.data('visited', true);
            }

        }
        else {
            if (page.data('visited')) {
                page.data('visited-and-left', true);
            }
            $('#mg-skinner-container').remove();
        }
    
    });

})(jQuery, undefined);