const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
const { db, dbConnected } = require('./database');
const Log = require('./utils/logger').init(db);
// check operating system and use appropriate notifier
const notifier = require('./utils/notifier').init(Log);

const { fetchCharacterFromServer } = require('./service/character-service');
const { getSpecificSetting, updateSpecificSetting } = require('./service/settings-service');

const MASS_FETCH_TIMEOUT_IN_MILLISECONDS = 60000;

let massFetchTimeout;
let mainWindow;

app.on('ready', async () => {
    if (!dbConnected) {
        notifier.notify('The application could not start due to an error connecting to the local storage.');
        return app.quit();
    }

    // TODO perform db cleanup run (if needed)

    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'templates', 'main-page.html'),
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

        // fetch all chars from DB and send them to the page; this way we can ensure the initial UL is created and take it from there
        const characters = db.characters.find();
        mainWindow.webContents.send('characters:initial-db-fetch', characters);
    });
});

ipcMain.on('initial-list:created', event => {
    // the page is notifying us that the HTML list is ready; we can now fetch latest data and send it to the page
    massFetchCharacters();
});

ipcMain.on('add:character', async (event, character) => {
    const existing = db.characters.find({ name: character.name, server: character.server });

    if (Array.isArray(existing) && existing.length > 0) {
        // will be handled on the page as well; this code here is a fallback
        notifier.notify(`Character ${character.name}/${character.server} is already on the list`);
        return;
    }

    fetchCharacterFromServer(character, fetchedCharacter => {
        mainWindow.webContents.send('character:fetch-complete', fetchedCharacter);
    });
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
        pathname: path.join(__dirname, 'templates', 'error-log-page.html'),
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
 */
function massFetchCharacters () {
    // immediately restart the interval (actually a timeout, but the end result is same as with an interval)
    clearTimeout(massFetchTimeout);
    massFetchTimeout = setTimeout(async () => {
        massFetchCharacters();
    }, MASS_FETCH_TIMEOUT_IN_MILLISECONDS);

    mainWindow.webContents.send('mass-fetch:start');

    const characters = db.characters.find();

    for (let i = 0; i < characters.length; i++) {
        fetchCharacterFromServer(characters[i], fetchedCharacter => {
            if (fetchedCharacter.dinged) {
                notifier.notify(`DING!!! ${fetchedCharacter.name} - ${fetchedCharacter.level}!`);
            }
            mainWindow.webContents.send('character:fetch-complete', fetchedCharacter);

            if (i === characters.length - 1) {
                /*
                This does not guarantee that all previous fetches have been finished, but we don't care
                The main idea is to prevent incessant spamming of the Refresh button
                 */
                mainWindow.webContents.send('mass-fetch:finish');
            }
        });
    }

    if (characters.length === 0) {
        mainWindow.webContents.send('mass-fetch:finish');
    }
}
