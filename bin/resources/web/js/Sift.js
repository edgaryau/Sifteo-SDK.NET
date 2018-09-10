(function($) {

    // Define Sift

    // http://www.foliotek.com/devblog/getting-the-width-of-a-hidden-element-with-jquery-using-width/
    (function($) {
        $.fn.getHiddenDimensions = function(includeMargin) {
            var $item = this,
                props = { position: 'absolute', visibility: 'hidden', display: 'block' },
                dim = { width:0, height:0, innerWidth: 0, innerHeight: 0,outerWidth: 0,outerHeight: 0 },
                $hiddenParents = $item.parents().andSelf().not(':visible'),
                /*jsl:ignore*/
                includeMargin = (includeMargin === null) ? false : includeMargin;
                /*jsl:end*/

            var oldProps = [];
            $hiddenParents.each(function() {
                var old = {};

                for ( var name in props ) {
                    old[ name ] = this.style[ name ];
                    this.style[ name ] = props[ name ];
                }

                oldProps.push(old);
            });

            dim.width = $item.width();
            dim.outerWidth = $item.outerWidth(includeMargin);
            dim.innerWidth = $item.innerWidth();
            dim.height = $item.height();
            dim.innerHeight = $item.innerHeight();
            dim.outerHeight = $item.outerHeight(includeMargin);

            $hiddenParents.each(function(i) {
                var old = oldProps[i];
                for ( var name in props ) {
                    this.style[ name ] = old[ name ];
                }
            });

            return dim;
        };
    }(jQuery));

    if (typeof Sift != 'undefined') {
        console.log('Sift should not be defined yet!');
    }
    Sift = {};
    
    // Sift.openAppServerURL = function(href) {
    //     window.mainWindow.openLink(appServerURLFor(href));
    // }
    // 
    Sift.appServerURLFor = function(path) {
        try {
            return window.mainWindow.appServerUrlFor(path);
        }catch(e) {
            console.log("Error caught. mainWindow not instantiated: " + e);
            return "";
        }
    };
    
    Sift.Error = function(message, code) {
        this.message = message;
        this.code = code;
    };
    Sift.Error.prototype = new Error;       // the built-in Error that is
    
    Sift.jsAssert = function(condition) {
        if (!condition) {
            // @todo: hook into siftrunner's dev stream stuff ... oh wait, that doesn't exist yet either.
            throw new Sift.Error('Assert fired.');
        }
    };
    
    Sift.debug = {
    };

    if (typeof console == 'undefined') {
        console = {};
        $.each(['log', 'debug', 'warn', 'dir'], function(i, name) {
            window.console[name] = function() {};
        });
    }

    Sift.truncateTextToFit = function(domContainer, maxWidth) {
        var safety = 0;	// avoid accidental inifinite loop
        var jqContainer = $(domContainer);
        var text = $.trim(jqContainer.html());	// assumes markup structure
        while (jqContainer.outerWidth(true) > maxWidth && safety++ < 255) {
            jqContainer.html(text.substr(0, text.length - 2) + '&hellip;');
            text = jqContainer.html();
        }
    };

    // courtesy jresig (http://ejohn.org/blog/injecting-word-breaks-with-javascript/)
    Sift.softBreakString = function(str, num) {
        return str.replace(RegExp("(\\w{" + num + "})(\\w)", "g"), function(all, text, character) {
            return text + "<wbr>" + character;
        }); 
    };

    Sift.circleInRadians = Math.PI * 2;
    Sift.degToRadFactor = (Math.PI / 180);
    Sift.radToDegFactor = (180 / Math.PI);

    /**
     * Useful for binding a function to an object when you
     * pass it as a callback.
     */
	if (!Function.prototype._scope) {
		Function.prototype._scope = function(obj) {
			var f = this;
			return (function() {
				return f.apply(obj, arguments);
			});
		};
	}
  
  
  
})(jQuery);