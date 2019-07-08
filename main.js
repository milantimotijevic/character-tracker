const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
let appData = require('app-data-folder');
let applicationName = require('./package.json').build.productName;
let appDataPath = appData(applicationName);
const db = require('diskdb');
db.connect(appDataPath, ['characters']);

const { fetchCharacterFromServer } = require('./service/character-service');

let mainWindow;

/**
 * Fetch characters from the server, parse info and render them on the page
 * Removes characters that do not exist on Blizzard's server
 */
const renderCharacters = async () => {
    const characters = db.characters.find();

    for (let i = 0; i < characters.length; i++) {
        characters[i] = await fetchCharacterFromServer(characters[i]);
    }

    mainWindow.webContents.send('render:characters', characters);
};

app.on('ready', async () => {
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
        // TODO show 'character already saved' error message
        return;
    }

    db.characters.save(character);
    await renderCharacters();
});
