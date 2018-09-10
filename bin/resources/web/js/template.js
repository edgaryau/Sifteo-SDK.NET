Sift.Template = function(template) {
  var self = this;
  this._template = template;
  
  this.__defineGetter__('id', function() {
    return self._template.id;
  });
  this.__defineGetter__('title', function() {
    return self._template.title;
  });
  this.__defineGetter__('editorHTML', function() {
    return self._template.editorHTML;
  });
  this.__defineGetter__('type', function() {
    return self._template.type;
  });
};

Sift.Template.template = function(id) {
  var templates = builder.templates;
  for (var i = 0, len = templates.length; i < len; i++) {
    var t = templates[i];
    if (t.id == id) {
      return new Sift.Template(t);
    }
  }
  return null;
};
