/*
(function($, undefined) {
    Sift.User = function(uid, emailAddress, developer, name) {
        this.uid = uid;
        this.emailAddress = emailAddress;
        this.isDeveloper = (typeof developer == 'undefined') || developer;
        this.name = name;
    };
    Sift.User.prototype.toTrackerData = function() {
        return {
            user_id: this.uid,
            user_email: this.emailAddress,
            developer: this.isDeveloper
        };
    };
    
    // endpoint for userSession events
    Sift.User.session = {};
    Sift.User.session.isAvailable = function() {
        return Sift.User.currentUser.uid != 0;
    };

    Sift.User.handleSessionCreated = function(uid, emailAddress, isDeveloper, name) {
        Sift.User.currentUser.uid = uid;
        Sift.User.currentUser.emailAddress = emailAddress;
        Sift.User.currentUser.isDeveloper = isDeveloper;
        Sift.User.currentUser.name = name;
        $(Sift.User.session).trigger('created');
    };
    
    Sift.User.handleSessionCleared = function() {
        Sift.User.currentUser.uid = 0;
        Sift.User.currentUser.emailAddress = '';
        Sift.User.currentUser.name = '';
        $(Sift.User.session).trigger('cleared');
    };

    try {
        Sift.User.currentUser = new Sift.User(
            window.userSession.userID,
            window.userSession.email,
            window.userSession.developer,
            window.userSession.name
        );
    }catch(e) {
        Sift.User.currentUser = {};
    }

    // @todo: create/tear down user objects as they come and go

    Sift.Tracker.setUser(Sift.User.currentUser);
})(jQuery);
*/