const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
const notifier = require('node-notifier');
let appData = require('app-data-folder');
let appDataPath = appData('Character Tracker');
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
        const tempChar = characters[i];
        characters[i] = await fetchCharacterFromServer(characters[i]);
        /**
         * If character is not found in armory, notify the user and remove it from db
         */
        if (!characters[i]) {
            notifier.notify(`${tempChar.name}/${tempChar.server} does not exist`);
            db.characters.remove({_id: tempChar.id});
        }
        if (characters[i].dinged) {
            notifier.notify(`${characters[i].name} dinged ${characters[i].level}!`);
        }
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
        notifier.notify(`Character ${character.name}/${character.server} is already on the list`);
        return;
    }

    db.characters.save(character);
    addCharacterWindow.close();
    await renderCharacters();
});
