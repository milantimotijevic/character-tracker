/**
 * File system database
 **/
let appData = require('app-data-folder');
let appDataPath = appData('Character Tracker');
const fs = require('fs');

/**
 * Checks whether App Data (or Mac equivalent) exists and creates it if not
 * Typically, the installer should take care of this folder, but we still want to be on the safe side
 */
if (!fs.existsSync(appDataPath)){
    fs.mkdirSync(appDataPath);
}

const db = require('diskdb');
const dbConnected = db.connect(appDataPath, ['characters', 'logs', 'settings']);

module.exports = {
    db,
    dbConnected
};
