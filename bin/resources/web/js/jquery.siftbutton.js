
/**
 * our very own button. similar to jquery ui's button, but not as complete.
 * a couple of features over jQuery UI's button:
 * 
 * * rounded corners/dropshadow that are based on pngs instead of css.
 *      qtwebkit's current rendering of rounded corners and box shadow is
 *      pretty poor.
 * 
 * * enable/disable namespacing
 *      buttons will keep track of who asked them to disable, and will
 *      only enable visually when everyone who asked them to disable
 *      also asks them to re-enable.
 * 
 * caveats/notes:
 * 
 * * only two sizes available atm: 50px high or 32px high
 * 
 * * if you wish to set an explicit width on a button, you have to pass
 * it in as an option on init or via the 'option' method
 * 
 * * jquery ui's button icons are supported.
 * 
 */
;(function($) {
    var methods = {
        init: function(options) {
            this.each(function() {
                var $this = $(this);
                var data = $this.data('siftButton');

                if (!data) {
                    $this.data('siftButton', {
                        //disableStack: 0,
                        disableKeys: {},
                        label: ''
                    });

                    $this.wrapInner('<span class="sift-button-inner"/>');
                    if (options && 'icons' in options) {
                        if ('secondary' in options.icons) {
                            $this.prepend('<span class="ui-icon ' + options.icons.secondary + '"></span>');
                        }
                        if ('primary' in options.icons) {
                            $this.prepend('<span class="ui-icon ' + options.icons.primary + '"></span>');
                        }
                    }
                    $this.addClass('sift-button');
                    if (options && ('size' in options) && options.size == 'small') {
                        $this.addClass('small');
                    }
                    if (options && options.width) {
                        $this.css('width', 'inherit');
                        $this.find('.sift-button-inner').css('width', options.width);
                    }
                    // if (Array.prototype.indexOf.apply($this.get(0).style, ['width']) != -1) {
                    //     var w = $this.css('width');
                    //     $this.css('width', 'inherit');
                    //     $this.find('.sift-button-inner').css('width', w);
                    // }
                }
            });
            //return this.button.apply(this, arguments);
            return this;
        },
        option: function(key, value) {
            return this.each(function() {
                var $this = $(this);
                var extension = {};
                extension[key] = value;
                $.extend($this.data('siftButton'), extension);
                switch (key) {
                    case 'label':
                        $this.find('.sift-button-inner').html(value);
                    break;
                    case 'width':
                        $this.css('width', 'inherit');
                        $this.find('.sift-button-inner').css('width', value);
                    break;
                    default:
                    break;
                }
            });
        },
        destroy: function() {
            return this.each(function() {
                var $this = $(this);
                $this.removeData('siftButton');
            });
        },
        disable: function() {
            return methods.disableByKey.call(this, '__no_key__');
        },
        enable: function() {
            return methods.enableByKey.call(this, '__no_key__');
        },
        enableByKey: function(key) {
            this.each(function() {
                var $this = $(this);
                var keys = $this.data('siftButton').disableKeys;
                if (key in keys) {
                    delete keys[key];
                }

                var okToEnable = true;
                for (var k in keys) {
                    okToEnable = false;
                }
                if (okToEnable) {
                    $this.removeClass('disabled');
                }
                else {
                    //var s = [];
                    //for (var k in keys) { s.push(k); }
                    //console.log($this.html() + ' not enabling; keys are: ' + s.join(', '));
                }
            });
            return this;
        },
        disableByKey: function(key) {
            this.each(function() {
                var $this = $(this);
                var keys = $this.data('siftButton').disableKeys;
                if (!(key in keys)) {
                    keys[key] = true;
                }
                $this.addClass('disabled');
            });
            return this;
        },
        forceEnable: function() {
            this.each(function() {
                var $this = $(this);
                $this.data('siftButton').disableKeys = {};
                methods.enable.call($this);
            });
        }
    };

    $.fn.siftButton = function(method, options) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || typeof method == 'undefined') {
            return methods.init.apply(this, arguments);
        }
        else {
            var handled = false;
            // support namespacing
            if (typeof method === 'string') {
                var pieces = method.split('.');
                if (pieces[0] == 'enable' || pieces[0] == 'disable') {
                    return methods[pieces[0] + 'ByKey'].call(this, pieces[1]);
                }
            }
            return this;
        }
    };

})(jQuery);