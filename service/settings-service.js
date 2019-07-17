/**
 * Fetches and updates application settings
 * Settings are stored in a separate collection (array located in a file called 'settings.json') under 0th index
 **/
const { db } = require('../database');

const getSettings = () => {
    return db.settings.find()[0];
};

const getSpecificSetting = name => {
    return getSettings().data[name];
};

/**
 * Upserts a specific key-value pair inside the settings[0].data object
 */
const updateSetting = (setting) => {
    const { _id, data } = getSettings();
    const key = Object.keys(setting)[0];
    data[key] = setting[key];

    return db.settings.update({ _id }, { data });
};

module.exports = {
    getSpecificSetting,
    updateSetting
};

// === PERFORM SETTINGS OBJECT INITIALIZATION ===

// check if the settings object exists and initialize it if needed
let settings = getSettings();
if (!settings) {
    db.settings.save({
        data: {}
    });
}
