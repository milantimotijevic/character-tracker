/**
 * Fetches and updates application settings
 * Settings are stored in a separate collection (array located in a file called 'settings.json') under 0th index
 * All key-value pairs are stored under the 'data' property
 **/
const { db } = require('../database');

// === PUBLIC METHODS ===

const getSpecificSetting = name => {
    return getSettings().data[name];
};

/**
 * Upserts a specific key-value pair inside the settings[0].data object
 */
const updateSpecificSetting = setting => {
    const { _id, data } = getSettings();
    const key = Object.keys(setting)[0];
    data[key] = setting[key];

    return db.settings.update({ _id }, { data });
};

// === PRIVATE METHODS ===
const getSettings = () => {
    return db.settings.find()[0];
};

// === PERFORM SETTINGS OBJECT INITIALIZATION ===

// check if the settings object exists and initialize it if needed
let settings = getSettings();
if (!settings) {
    db.settings.save({
        data: {}
    });
}

module.exports = {
    getSpecificSetting,
    updateSpecificSetting
};
