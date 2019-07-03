const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const path = require('path');

let mainWindow;

const characters = [];
const renderCharacters = () => {
    if (!mainWindow || !mainWindow.webContents) {
        return;
    }

    mainWindow.webContents.send('render:characters', characters);
};

app.on('ready', () => {
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

    renderCharacters();
});

let addCharacterWindow;

ipcMain.on('open:add-character-page', (event) => {
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
