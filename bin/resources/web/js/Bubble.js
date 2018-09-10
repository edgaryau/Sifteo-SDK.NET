
/**
 *
 * Usage: 
 * 
 *      var bubble = new Sift.Bubble('some content', { ... options ... });
 *      bubble.attach(element);
 *
 * If showOnHover is used in the options, you're done. Otherwise, show 
 * and hide based on events:
 *
 *      element.click(function() {
 *          bubble.show();
 *      });
 * 
 * Options:
 * 
 *      showOnHover: if true, bubble will show/hide on mouseOver/mouseOut
 *      pointerSize: the size of the bubble's pointer
 *      pointerMargin: distance from edge to pointer
 *      radius: rounded rect corner radius
 *      closeButton: if true, show a close button
 *      fadeInSpeed: ms or string for fade in speed
 *      fadeOutSpeed: ms or string for fade in speed
 *      shadowSize: # pixels of shadow (only in +y direction at the moment)
 *      shadowWeight: how dark the shadow will be (good range is around 0.07)
 *      shadowDiffusion: eh, don't even use this
 *      strokeWeight: pixels of stroke
 *      gradientStartColor: top color for gradient in bubble
 *      gradientStopColor: bottom color for gradient in bubble
 * 
 *      appendTo: if present, the dom element in which the bubble will live 
 *      (otherwise it will be appended to the document body)
 * 
 *      scrollableParent: if present, position calculations will be made 
 *      relative to this element's scroll position. otherwise, position
 *      calculations will be made relative to the document
 * 
 * One thing: best results probably when passed content has an explicit width
 * set on it.
 * 
 * Drop shadow generation is pretty ghetto at the moment. We only do it at all
 * because Qt's webkit's implementation of global shadow properties seem to
 * have no effect.
 *
 */
Sift.Bubble = function(content, options) {
    this.jqContainer = $('\
        <div class="bubble" style="display:none;">\
            <canvas style="position:absolute;"></canvas>\
            <div class="bubble-content"></div>\
            <div class="close-box"></div>\
        </div>\
    ');
    this.jqCanvas = $('canvas', this.jqContainer);
    this.ctx = this.jqCanvas.get(0).getContext('2d');
    this.jqContent = $('.bubble-content', this.jqContainer);
    this.jqContent.html(content || '[content]');
    
    this.options = $.extend({}, {
        showOnHover: false,
        preserveHoverOnBubble: true,
        pointerSize: 20,
        pointerMargin: 20,
        pointerDistance: 0,
        radius: 20,
        closeButton: true,
        appendTo: null,
        fadeInSpeed: 'fast',
        fadeOutSpeed: 'fast',
        shadowSize: 10,
        shadowWeight: 0.07,
        shadowDiffusion: 0,
        strokeWeight: 2,
        strokeColor: 'rgba(40, 40, 40, .8)',
        gradientStartColor: 'rgba(255, 255, 255, 255)',
        gradientStopColor: 'rgba(220, 220, 220, 255)'
    }, options);

    if (this.options.closeButton) {
        this.jqCloseBox = $('.close-box', this.jqContainer)
            .click((function() {
                this.jqContainer.fadeOut();
                if (this.bubbleHideTimer) {
                    clearTimeout(this.bubbleHideTimer);
                }
            })._scope(this))
            .hover((function() {
                this.closeBoxHover = true;
                this.drawBubble();
            })._scope(this), (function() {
                this.closeBoxHover = false;
                this.drawBubble();
            })._scope(this));
    }
    this.dontHide = false;
    this.bubbleHideTimer = -1;
    this.mode = 'top-left';
    Sift.Bubble.bubbles.push(this);
};

Sift.Bubble.bubbles = [];
/**
 * Hide all bubbles.
 */
Sift.Bubble.hideAll = function() {
    $.each(Sift.Bubble.bubbles, function(i, bubble) {
        bubble.hide();
    });
};

Sift.Bubble.prototype.remove = function() {
    this.jqContainer.remove();
};

Sift.Bubble.prototype.getContainer = function() {
    return this.jqContainer;
};
Sift.Bubble.prototype.getContent = function() {
    return this.jqContent;
};
Sift.Bubble.prototype.getCanvas = function() {
    return this.jqCanvas;
};
Sift.Bubble.prototype.getCanvasContext = function() {
    return this.ctx;
};
Sift.Bubble.prototype.getGradient = function() {
    return this.gradient;
};
Sift.Bubble.prototype.setGradient = function(gradient) {
    this.gradient = gradient;
};
Sift.Bubble.prototype.getContentDimensions = function(gradient) {
    return this.contentDimensions;
};
Sift.Bubble.prototype.redraw = function() {
    this.drawBubble();
};
Sift.Bubble.prototype.reposition = function() {
    this.show();
};
Sift.Bubble.prototype.isVisible = function() {
    return this.jqContainer.filter(':visible').length > 0;
};

Sift.Bubble.prototype.show = function() {
    // calculate if we should show the bubble above or below/left or right
    // these vars refer to where the pointer winds up
    var topBottom = 'top';
    var leftRight = 'left';
    var spaceBelow = this.jqScrollableParent.innerHeight() - this.jqScrollableParent.scrollTop() - (this.jqElement.offset().top + this.jqElement.outerHeight());
    var spaceAbove = this.jqElement.offset().top - this.jqScrollableParent.scrollTop();
    if (spaceAbove > spaceBelow) {
        topBottom = 'bottom';
    }
    var spaceRight = this.jqScrollableParent.innerWidth()  - this.jqScrollableParent.scrollLeft() - (this.jqElement.offset().left + this.jqElement.outerHeight());
    var spaceLeft = this.jqElement.offset().left - this.jqScrollableParent.scrollLeft();
    if (spaceLeft > spaceRight) {
        leftRight = 'right';
    }
    var midX = this.elementPosition().left + (this.jqElement.innerWidth() / 2);
    var pointerOffsetX = this.options.pointerMargin + this.options.radius + (this.options.pointerSize / 2);
    if (leftRight == 'left') {
        this.jqContainer.css('left', midX - pointerOffsetX);
    }
    else {
        this.jqContainer.css('left', midX - this.jqContainer.innerWidth() + pointerOffsetX);
    }
    if (topBottom == 'top') {
        this.jqContainer.css('top', this.elementPosition().top + this.jqElement.innerHeight() + this.options.pointerSize + this.options.strokeWeight + this.options.pointerDistance);
        this.jqCanvas.css('top', '-20px');
    }
    else {
        this.jqContainer.css('top', this.elementPosition().top - this.jqContainer.innerHeight() - this.options.pointerSize - this.options.strokeWeight - this.options.pointerDistance);
        this.jqCanvas.css('top', '0');
    }
    this.mode = topBottom + '-' + leftRight;

    this.drawBubble();
    this.jqContainer.fadeIn(this.options.fadeInSpeed);
};

Sift.Bubble.prototype.hide = function() {
    if (!this.dontHide) {
        this.jqContainer.fadeOut(this.options.fadeOutSpeed);
    }
    this.bubbleHideTimer = -1;
};

/**
 * 
 */
Sift.Bubble.prototype.attach = function(element) {
    this.jqElementParent = $(element).parent();
    this.jqElement = $(element);
    
    if (this.options.scrollableParent) {
        this.jqScrollableParent = $(this.options.scrollableParent);
        this.elementPosition = this.jqElement.position._scope(this.jqElement);
    }
    else {
        this.jqScrollableParent = $('body');
        this.elementPosition = this.jqElement.offset._scope(this.jqElement);
    }
    
    this.jqContainer.appendTo(this.options.appendTo ? $(this.options.appendTo) : $('body'));
    
    this.contentDimensions = this.jqContent.getHiddenDimensions(true);
    this.jqCanvas.attr({
        width: this.contentDimensions.outerWidth + this.options.strokeWeight * 2,
        height: this.contentDimensions.outerHeight + this.options.pointerSize + this.options.shadowSize
    });
    this.jqContainer.css({
        width: this.contentDimensions.outerWidth,
        height: this.contentDimensions.outerHeight
    });
    
    this.gradient = this.ctx.createLinearGradient(0, 0, 0, this.contentDimensions.outerHeight);
    //this.gradient.addColorStop(0, 'rgba(200, 200, 150, 200)');
    //this.gradient.addColorStop(1, 'rgba(220, 220, 210, 200)');
    this.gradient.addColorStop(0, this.options.gradientStartColor);
    this.gradient.addColorStop(1, this.options.gradientStopColor);

    
    if (this.options.showOnHover) {
        if (this.options.preserveHoverOnBubble) {
            this.jqContainer.hover((function() {
                if (this.bubbleHideTimer) {
                    clearTimeout(this.bubbleHideTimer);
                }
            })._scope(this), (function() {
                this.bubbleHideTimer = setTimeout(this.hide._scope(this), 200);
            })._scope(this));
        }
        
        $(this.jqElement).hover((function() {
            this.dontHide = true;
            if (this.bubbleHideTimer) {
                clearTimeout(this.bubbleHideTimer);
            }
            this.show();
        })._scope(this), (function() {
            this.dontHide = false;
            this.bubbleHideTimer = setTimeout(this.hide._scope(this), 200);
        })._scope(this));
    }
};

Sift.Bubble.prototype.drawBubble = function() {

    this.ctx.clearRect(0, 0, this.jqCanvas.get(0).width, this.jqCanvas.get(0).height);
    
    this.ctx.save();
    
    // a little space for border thickness
    this.ctx.translate(this.options.strokeWeight , this.options.strokeWeight);
    
    if (this.mode == 'top-left' || this.mode == 'top-right') {
        this.ctx.translate(0, this.options.pointerSize);
    }
    
    // ghetto drop shadow
    if (this.options.shadowWeight > 0 && this.options.shadowSize > 0) {
        var alpha = this.options.shadowWeight;
        var midX = (this.contentDimensions.outerWidth / 2) + this.options.strokeWeight / 2;
        var midY = (this.contentDimensions.outerHeight / 2) + this.options.strokeWeight / 2;
        for (var i = 0; i < this.options.shadowSize; i++) {
            var p = i + 1;
            this.ctx.save();
            if (this.options.shadowDiffusion > 0) {
                this.ctx.translate(midX, midY);
                this.ctx.scale(1 + (p * this.options.shadowDiffusion), 1 + (p * this.options.shadowDiffusion));
                this.ctx.translate(-midX, -midY);
            }
            this.ctx.translate(0, p);
            this.makeBubblePath();
            this.ctx.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    // fill
    this.makeBubblePath();
    this.ctx.save();
    this.ctx.fillStyle = this.gradient;
    this.ctx.fill();
    this.ctx.restore();
    
    // stroke, using same shape
    if (this.options.strokeWeight > 0) {
        this.ctx.save();
        this.ctx.strokeStyle = this.options.strokeColor;
        this.ctx.lineWidth = this.options.strokeWeight;
        this.ctx.stroke();
        this.ctx.restore();
    }

    // draw close button
    if (this.options.closeButton) {
        this.ctx.save();
        this.ctx.translate(this.contentDimensions.outerWidth - 20, 20);
        this.drawCloseBox();
        this.ctx.restore();
    }

    this.ctx.restore();
};

/**
* w/props to Juan Mendes, http://js-bits.blogspot.com/2010/07/canvas-rounded-corner-rectangles.html
*/
Sift.Bubble.prototype.makeBubblePath = function() {
    var x = 0;
    var y = 0;
    var width = this.contentDimensions.outerWidth;
    var height = this.contentDimensions.outerHeight;
    var margin = this.options.pointerMargin;
    var pointerSize = this.options.pointerSize;
    var radius = this.options.radius;

    this.ctx.beginPath();
    this.ctx.lineTo(x + radius, y);
    if (this.mode == 'top-left') {
        this.ctx.lineTo(x + radius + margin, y);
        this.ctx.lineTo(x + radius + margin + (pointerSize / 2), y - pointerSize);
        this.ctx.lineTo(x + radius + margin + pointerSize, y);
    }
    if (this.mode == 'top-right') {
        this.ctx.lineTo(x + width - radius - margin - pointerSize, y);
        this.ctx.lineTo(x + width - radius - margin - (pointerSize / 2), y - pointerSize);
        this.ctx.lineTo(x + width - radius - margin, y);
    }
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    if (this.mode == 'bottom-right') {
        this.ctx.lineTo(x + width - radius - margin, y + height);
        this.ctx.lineTo(x + width - radius - margin - (pointerSize / 2), y + height + pointerSize);
        this.ctx.lineTo(x + width - radius - margin - pointerSize, y + height);
    }
    if (this.mode == 'bottom-left') {
        this.ctx.lineTo(x + radius + margin + pointerSize, y + height);
        this.ctx.lineTo(x + radius + margin + (pointerSize / 2), y + height + pointerSize);
        this.ctx.lineTo(x + radius + margin, y + height);
    }
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
};

Sift.Bubble.prototype.drawCloseBox = function() {
    this.ctx.save();

	this.ctx.beginPath();
	this.ctx.arc(0, 0, (20 / 2), 0, Sift.circleInRadians, true);
	this.ctx.closePath();
    if (this.closeBoxHover) {
		this.ctx.fillStyle = 'rgba(0, 0, 0, .3)';
    }
    else {
		this.ctx.fillStyle = 'rgba(0, 0, 0, .1)';
    }
	this.ctx.fill();

	this.ctx.beginPath();
	this.ctx.rotate(Sift.circleInRadians / 8);
	this.ctx.rect(-5, -1.5, 10, 3);
	this.ctx.rotate(Sift.circleInRadians / 4);
	this.ctx.rect(-5, -1.5, 10, 3);
	this.ctx.closePath();
	this.ctx.fillStyle = 'rgba(5, 0, 0, .4)';
	this.ctx.fill();

	this.ctx.restore();
};
