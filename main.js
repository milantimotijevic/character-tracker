const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
const db = require('diskdb');
db.connect(path.join(__dirname, 'filestorage'), ['characters']);

const { fetchCharacterFromServer } = require('./service/character-service');

let mainWindow;

/**
 * Fetch characters from the server, parse info and render them on the page
 * Removes characters that do not exist on Blizzard's server
 */
const renderCharacters = () => {
    const characters = db.characters.find();

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

    mainWindow.webContents.on('did-finish-load', () => {
        renderCharacters();
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

    if (existing) {
        // TODO show 'character already saved' error message
        return;
    }

    db.characters.save(character);
    renderCharacters();
});
