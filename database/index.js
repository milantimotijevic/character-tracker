/**
 * File system database
 **/
let appData = require('app-data-folder');
let appDataPath = appData('Character Tracker');
const db = require('diskdb');
const dbConnected = db.connect(appDataPath, ['characters', 'logs', 'settings']);

module.exports = {
    db,
    dbConnected
};
