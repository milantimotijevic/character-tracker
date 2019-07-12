const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
const notifier = require('node-notifier');
let appData = require('app-data-folder');
let appDataPath = appData('Character Tracker');
const db = require('diskdb');

const { fetchCharacterFromServer } = require('./service/character-service');

const CHARACTER_TRACKER = 'Character Tracker';
const RENDER_CHARACTERS_TIMEOUT_MILLISECONDS = 60000;

let renderCharactersTimeout;
let mainWindow;

app.on('ready', async () => {
    const dbConnected = db.connect(appDataPath, ['characters']);

    if (!dbConnected) {
        notifier.notify({
            title: CHARACTER_TRACKER,
            text: 'The application could not start due to an error connecting to the local storage.'
        });
        return app.quit();
    }

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
        await renderCharacters();
    });
});

let addCharacterWindow;

ipcMain.on('open:add-character-page', async (event) => {
    addCharacterWindow = new BrowserWindow({
        width: 200,
        height: 200,
        webPreferences: {
            nodeIntegration: true
        }
    });
    addCharacterWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'templates', 'add-character-page.html'),
        protocol: 'file:',
        slashes: true
    }));

    addCharacterWindow.on('closed', () => {
        addCharacterWindow = null;
    });
});

ipcMain.on('add:character', async (event, character) => {
    const existing = db.characters.find({ name: character.name, server: character.server });

    if (Array.isArray(existing) && existing.length > 0) {
        notifier.notify({
            title: CHARACTER_TRACKER,
            text: `Character ${character.name}/${character.server} is already on the list`
        });
        return;
    }

    db.characters.save(character);
    addCharacterWindow.close();
    await renderCharacters();
});

ipcMain.on('refresh:characters', async (event) => {
    await renderCharacters();
});

/**
 * Fetch characters from the server, parse info and render them on the page
 * Removes characters that do not exist on Blizzard's server
 * Unless if manually called in between, this function will be automatically called every X seconds
 */
const renderCharacters = async () => {
    /**
     * Whenever renderCharacters is called, we want to stop any ongoing timeout for its execution
     */
    clearTimeout(renderCharactersTimeout);
    mainWindow.webContents.send('character-fetch:in-progress');

    const characters = db.characters.find();
    const charactersToRender = [];

    for (let i = 0; i < characters.length; i++) {
        const tempChar = await fetchCharacterFromServer(characters[i]);
        /**
         * If character is not found in armory, notify the user and remove it from db
         */
        if (!tempChar) {
            notifier.notify({
                title: CHARACTER_TRACKER,
                text: `${characters[i].name}/${characters[i].server} does not exist`
            });
            db.characters.remove({_id: characters[i]._id});
            continue;
        }
        if (characters[i].dinged) {
            notifier.notify({
                title: CHARACTER_TRACKER,
                text: `DING!!! ${characters[i].name} - ${characters[i].level}!`
            });
        }

        charactersToRender.push(tempChar);
    }

    mainWindow.webContents.send('render:characters', charactersToRender);
    /**
     * Render characters process has been completed and we now want to schedule the next automatic call to the function
     * This guarantees that the function is called at least once every X seconds, whereas any manual calls to it
     * will reset this interval (actually using timeout instead of interval, but it achieves the same result)
     */
    renderCharactersTimeout = setTimeout(async () => {
        await renderCharacters();
    }, RENDER_CHARACTERS_TIMEOUT_MILLISECONDS);
};
