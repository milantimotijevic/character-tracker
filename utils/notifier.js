/**
 * Wraps appropriate NodeJS notifier module, instantiates the right version based on OS and handles error logging
 * relevant to notifications
 **/
let notifier = require('node-notifier');
const os = require('os');

//Extract Windows-specific notifier if needed
const platformPrefix = os.platform().substring(0, 3);
if (platformPrefix === 'win') {
    // TODO fix the issue with Windows notifications not working
    const WindowsToaster = notifier.WindowsToaster;
    notifier = new WindowsToaster();
}

const appName = 'com.character.tracker';
const CHARACTER_TRACKER = 'Character Tracker';

/**
 * Initializes OS-level notifier
 * Uses 3rd party library and requires OS-specific setup
 */
const initOsNotifier = Log => {
    return {
      notify: message => {
          notifier.notify({
              appName,
              title: CHARACTER_TRACKER,
              message
          }, err => {
              if (err) {
                  Log.error(err);
              }
          });
      }
    };
};

/**
 * Initializes a DOM-level notifier
 * Essentially, it needs a DOM element to display the message in
 * The message will persist up to X seconds, governed by the timeout property which gets reset on each call
 * This means only one message can be present in the DOM element at any given time
 */
const initDomNotifier = function(element){
    return {
        timeout: undefined,
        notify: text => {
            clearTimeout(this.timeout);
            element.innerHTML = text;
            this.timeout = setTimeout(() => {
                element.innerHTML = '';
            }, 5000);
        }
    };
};

module.exports = {
    initOsNotifier,
    initDomNotifier
};
