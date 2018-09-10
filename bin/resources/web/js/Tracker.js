

(function($) {
    
    Sift.onMetricsReady = function() {
        Sift.Metrics.init(Sift.appServerURLFor("/metrics/track"));
        if (loggedInUser) {
            Sift.Tracker.setUser(loggedInUser);
        }
        else {
            mainController.userLoggedIn.connect(function() {
                Sift.Tracker.setUser(loggedInUser);
            });
        }
        mainController.userLoggedOut.connect(function() {
            Sift.Tracker.setUser(null);
        });
    };
    
    $(document).ready(function() {
        setTimeout(function() {
            var siftTrack = document.createElement("script"); 
            siftTrack.type = "text/javascript"; 
            siftTrack.async = true;
            siftTrack.src = Sift.appServerURLFor("/javascripts/metrics.js");
            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(siftTrack, s);
        }, 0);
    });


    Sift.Tracker = {
        currentUser: null,
        setUser: function(user) {
            Sift.Tracker.currentUser = user;
            //console.debug('setting tracking user to', Sift.Tracker.currentUser);
        },
        getUserTrackerData: function(user) {
            user = user || Sift.Tracker.currentUser;
            if (user) {
                return {
                    user_id: user.getServerID(),
                    user_email: user.getEmailAddress(),
                    developer: mainController.isInDeveloperMode()
                };
            }
            return {};
        },
        trackEvent: function(event, opts) {
            opts = opts || {};
            var trackEvent = ['track', event, $.extend({}, 
                opts, 
                Sift.Tracker.getUserTrackerData(),
                Sift.SystemConfig.toTrackerData()
            )];
            if(Sift.Metrics) {
              Sift.Metrics.track(event, opts);
            }else{
              if(!Sift.metricsQueue) {
                Sift.metricsQueue = [];
              }
              Sift.metricsQueue.push([event, opts]);
            }
        }
        
    };
})(jQuery);