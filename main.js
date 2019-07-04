const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const path = require('path');

let mainWindow;

const characters = [
    {
        player: 'player 1',
        name: 'char 1',
        level: 1,
        server: 's1'
    },
    {
        player: 'player 2',
        name: 'char 2',
        level: 2,
        server: 's1'
    }
];

const renderCharacters = () => {
    characters.forEach(item => {
        item.level = item.level ? item.level : 1;
    });

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

    //mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-finish-load', () => {
        renderCharacters();
    });
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

ipcMain.on('add:character', (event, character) => {
    characters.push(character);
    renderCharacters();
});
