/**
 * Wraps appropriate NodeJS notifier module, instantiates the right version based on OS and handles error logging
 * relevant to notifications
 **/
let notifier = require('node-notifier');
const os = require('os');

//Extract Windows-specific notifier if needed
const platformPrefix = os.platform().substring(0, 3);
if (platformPrefix === 'win') {
    const WindowsToaster = notifier.WindowsToaster;
    notifier = new WindowsToaster();
}

const appName = 'com.character.tracker';
const CHARACTER_TRACKER = 'Character Tracker';

const init = Log => {
    return {
      // wrap external module's 'notify' method so we can pass it more easily and log errors in a single place
      notify: text => {
          // TODO use this one only for DING notifications; switch to in-browser notifications for everything else
          notifier.notify({
              appName,
              title: CHARACTER_TRACKER,
              text
          }, err => {
              if (err) {
                  Log.error(err);
              }
          });
      }
    };
};

module.exports = {
    init,

};
