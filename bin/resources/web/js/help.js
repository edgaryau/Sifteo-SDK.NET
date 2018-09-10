/**
 * Generate Table of Contents
 */
$(function() {
	var faq = $(".faq");
	var toc = $("<ol></ol>").prependTo(faq);
	faq.find("h4").each(function(i) {
		var id = "question-" + i;
		var h4 = $(this);
		var a = $("<a></a>");
		a.attr("href", "#" + id).text(h4.text());
		h4.attr("id", id);
		toc.append($("<li></li>").append(a));
	});
	$('.close-button').click(function() {
	    mainWindow.exitTour();
	    return false;
	});
});