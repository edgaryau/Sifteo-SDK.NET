(function($) {
    $('a[href^="http://"], a[href^="https://"]').live("click", function() {
        window.mainWindow.openLink($(this).attr("href"));
        return false;
    });


    $('a.appServerLink').click(function() {
        var href = $(this).attr("href");
        try {
            window.mainWindow.openAppServerLink(href);
        }
        catch(e) {
            console.log("Could not open appServer link " + href);
        }
        return false;
    }); 

    $('a.externalLink').click(function() {
        var href = $(this).attr("href");
        try {
            window.mainWindow.openLink(href);
        }
        catch(e) {
            console.log("Could not open external link " + href);
        }
        return false;
    });

    $('.storeLink').live("click", function() {
        window.mainWindow.showStore($(this).attr("href"));
        return false;
    });

    $('.accountLink').live("click", function() {
        window.mainWindow.showAccount($(this).attr("href"), true);
        return false;
    });


    $("a.button, a.submit").live("click", function() {
        $(this).parents("form:first").submit();
    });

})(jQuery);

