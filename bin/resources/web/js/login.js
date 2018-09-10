$(function() {
  Sift.Tracker.trackEvent('login-load');
  $('#login-button').siftButton().click(function() {
      $(this).parents('form').submit();
  });
  $("#login form").get(0).reset();
  $("#login form input#email").focus();
  $("#login form").submit(function() {
    var email = $("#login form input#email").val();
    var password = $("#login form input#password").val();
    try {
        mainController.requestAuthByPassword(email, password);
        $('#login-button').siftButton('option', 'label', 'Logging in&hellip;').siftButton('disable');
        Sift.Tracker.trackEvent('login-submit');
    }
    catch(e) {
        resetLoginForm();
    }
    return false;
  });
  
    mainController.userLoggedIn.connect(function() {
        resetLoginForm();
    });

    authController.authNetworkFailure.connect(function() {
        resetLoginForm();
        showAuthErrorMessage('There was a problem contacting Sifteo to log you in.');
    });

    authController.authCredentialsRejected.connect(function() {
        resetLoginForm();
        showAuthErrorMessage('The username or password you entered is incorrect.');
    });
    
    authController.authParseError.connect(function() {
        resetLoginForm();
        showAuthErrorMessage('There was a problem logging you in!');
    });

    window.showAuthErrorMessage = function(message) {
        $('#authErrorMessage .msg').html(message).slideDown();
        $("#email, #password").bind('change.authError', function() {
            $('#authErrorMessage .msg').slideUp();
            $('#email, #password').unbind('change.authError');
        });
    };
  
    window.resetLoginForm = function() {
        $('#login-button').siftButton('option', 'label', 'Login').siftButton('enable');
    };
});
