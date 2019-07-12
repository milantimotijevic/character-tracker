const db = require('diskdb');
let appData = require('app-data-folder');
let appDataPath = appData('Character Tracker');
const dbConnected = db.connect(appDataPath, ['characters', 'logs']);
const Log = require('./utils/logger').init(db);

for (let i = 0; i < 1000; i++) {
    Log.error('La gente esta muuuuy locaaa!!');
}
