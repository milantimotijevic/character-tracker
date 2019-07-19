const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
const { db, dbConnected } = require('./database');
const Log = require('./utils/logger').init(db);
// check operating system and use appropriate notifier
const osNotifier = require('./utils/notifier').initOsNotifier(Log);

const { fetchCharacterFromServer } = require('./service/character-service');
const { getSpecificSetting, updateSpecificSetting } = require('./service/settings-service');

const MASS_FETCH_TIMEOUT_IN_MILLISECONDS = 60000;

let massFetchTimeout;
let mainWindow;

app.on('ready', async () => {
    if (!dbConnected) {
        osNotifier.notify('The application could not start due to an error connecting to the local storage.');
        return app.quit();
    }

    // TODO perform db cleanup run (if needed)

    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'pages', 'html', 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    mainWindow.on('closed', () => {
        mainWindow = null;
        app.quit();
    });

    //mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-finish-load', async () => {
        const lastServer = getSpecificSetting('lastServer');
        mainWindow.webContents.send('get:last-server', lastServer);

        let disableAutoRefresh = !!getSpecificSetting('disableAutoRefresh');
        mainWindow.webContents.send('get:disable-auto-refresh', disableAutoRefresh);
        // fetch all chars from DB and send them to the page; this way we can ensure the initial UL is created and take it from there
        const characters = db.characters.find();
        mainWindow.webContents.send('characters:initial-db-fetch', characters);
    });
});

ipcMain.on('initial-list:created', event => {
    // the page is notifying us that the HTML list is ready; we can now fetch latest data and send it to the page
    massFetchCharacters(true);
});

ipcMain.on('add:character', async (event, character) => {
    const existing = db.characters.find({ name: character.name, server: character.server });

    if (Array.isArray(existing) && existing.length > 0) {
        // will be handled on the page as well; this code here is a fallback
        osNotifier.notify(`Character ${character.name}/${character.server} is already on the list`);
        return;
    }

    mainWindow.webContents.send('character:fetch-start', character);
    fetchCharacterFromServer(character, fetchedCharacter => {
        mainWindow.webContents.send('character:fetch-complete', fetchedCharacter);
    });
});

ipcMain.on('set:disable-auto-refresh', (event, disableAutoRefresh) => {
    updateSpecificSetting({ disableAutoRefresh });
    // send the value back so the page updates it only after the DB value has been updated
    mainWindow.webContents.send('get:disable-auto-refresh', disableAutoRefresh);
});

ipcMain.on('refresh:characters', async (event) => {
    massFetchCharacters();
});

ipcMain.on('update:last-server', (event, lastServer) => {
    updateSpecificSetting({ lastServer });
});

let errorLogWindow;
ipcMain.on('show:error-log', event => {
    errorLogWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });
    errorLogWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'pages', 'html', 'error-log.html'),
        protocol: 'file:',
        slashes: true
    }));

    errorLogWindow.on('closed', () => {
        errorLogWindow = null;
    });

    const errors = db.logs.find({type: 'ERROR'});

    errorLogWindow.webContents.on('did-finish-load', () => {
        errorLogWindow.webContents.send('show:errors', errors);
    });
});

ipcMain.on('errors-page:close', event => {
    if (!errorLogWindow) {
        return;
    }

    errorLogWindow.close();
});

ipcMain.on('character:remove', async (event, _id) => {
    db.characters.remove({_id});
});

/**
 * Triggers fetchCharacterFromServer on all characters in DB
 * Unless if manually called in between, this function will be automatically called every X seconds
 * The 'auto' flag signals that the function was called automatically - on initial load or interval
 * This allows us to determine whether we wish to prevent the process from being carried out based on a setting ('disableAutoRefresh')
 */
function massFetchCharacters (auto) {
    // immediately restart the interval (actually a timeout, but the end result is same as with an interval)
    clearTimeout(massFetchTimeout);
    massFetchTimeout = setTimeout(async () => {
        massFetchCharacters(auto);
    }, MASS_FETCH_TIMEOUT_IN_MILLISECONDS);

    if (auto && getSpecificSetting('disableAutoRefresh')) {
        /*
            the function was called automatically, but the setting says auto refresh should be disabled
            we still want to leave the interval (timeout) rolling, but right now we want to prevent the function
            from doing its main thing
         */
        return;
    }

    mainWindow.webContents.send('mass-fetch:start');

    const characters = db.characters.find();

    let count = 0;
    for (let i = 0; i < characters.length; i++) {
        mainWindow.webContents.send('character:fetch-start', characters[i]);
        fetchCharacterFromServer(characters[i], fetchedCharacter => {
            count++;
            if (fetchedCharacter.dinged) {
                osNotifier.notify(`DING!!! ${fetchedCharacter.name} - ${fetchedCharacter.level}!`);
            }
            mainWindow.webContents.send('character:fetch-complete', fetchedCharacter);

            if (count === characters.length) {
                mainWindow.webContents.send('mass-fetch:finish');
            }
        });
    }

    if (characters.length === 0) {
        mainWindow.webContents.send('mass-fetch:finish');
    }
}
