const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;
const characterListElement = document.getElementById('character-list');
const os = require('os');

const centerDomNotifier = require('../../utils/notifier').initDomNotifier(document.getElementById('notification'));

document.getElementById('show-error-log-btn').addEventListener('click', () => {
    ipcRenderer.send('show:error-log');
});


/**
 * Try to fetch machine name so we can use it in a greeting
 * If it fails, we simply print a generic greeting
 */
let greetingSuffix;
try {
    greetingSuffix = `, ${os.hostname()}`;
} catch (err) {
    greetingSuffix = ` there`;
}
document.getElementById('greeting').innerHTML = `Hello${greetingSuffix}!`;

const serverNameInput = document.getElementById('server-name');
const characterNameInput = document.getElementById('char-name');

const addCharacterButton = document.getElementById('add-char-btn');

/*
 * Pressing Enter in either of the two inputs either calls addCharacter, or shifts focus to the other input,
 * depending on which input is missing a value
 */
serverNameInput.addEventListener('keypress', event => {
    shiftFocusOrAddCharacter(event, serverNameInput, characterNameInput);
});

characterNameInput.addEventListener('keypress', event => {
    shiftFocusOrAddCharacter(event, characterNameInput, serverNameInput);
});

addCharacterButton.addEventListener('click', addCharacter);

const disableAutoRefreshCheckboxElement = document.getElementById('disable-auto-refresh-checkbox');
ipcRenderer.on('get:disable-auto-refresh', (event, checked) => {
    disableAutoRefreshCheckboxElement.checked = checked;
});

disableAutoRefreshCheckboxElement.addEventListener('change', () => {
    ipcRenderer.send('set:disable-auto-refresh', disableAutoRefreshCheckboxElement.checked);
});

const refreshButton = document.getElementById('refresh');
refreshButton.addEventListener('click', () => {
    ipcRenderer.send('refresh:characters');
});

// === IPC EVENT LISTENERS ===

ipcRenderer.on('characters:initial-db-fetch', (event, characters) => {
    // these characters are coming straight from the db and we want to render them in HTML before triggering a mass fetch
    for (let i = 0; i < characters.length; i++) {
        handleCharacterLi(characters[i]);
    }

    // the list is ready, so we want to notify the main process that it can start the mass fetch sequence
    ipcRenderer.send('initial-list:created');

    checkCharacterListStatus();
});

ipcRenderer.on('get:last-server', (event, lastServer) => {
    // attempt to fetch last used server name from db and auto-populate the input if it is present
    serverNameInput.value = lastServer ? lastServer : '';

    // focus the field that is more likely to get its value populated (char name if server is auto-populated; server name otherwise)
    if (!serverNameInput.value) {
        serverNameInput.focus();
    } else {
        characterNameInput.focus();
    }
});
/**
 * Displays the current status of the character list
 * For example, it could say that character data is being loaded, or that there are no characters to show
 */
const characterStatusElement = document.getElementById('character-status');

// we don't want to allow the user to spam mass fetch, that's why we hide the button when we know mass fetch is in progress
ipcRenderer.on('mass-fetch:start', event => {
    characterStatusElement.innerHTML = 'Loading latest data...';
    refreshButton.style.visibility = 'hidden';
});

ipcRenderer.on('mass-fetch:finish', event => {
    checkCharacterListStatus();
});

ipcRenderer.on('character:fetch-start', (event, character) => {
    const li = findCharacterLi(character);
    toggleDisabledRemoveButton(li, true);
});

ipcRenderer.on('character:fetch-complete', (event, character) => {
    // find appropriate 'li' based on 'character-identifier' property
    const li = findCharacterLi(character);
    handleCharacterLi(character, li);
    toggleDisabledRemoveButton(li, false);
});

// === HELPER FUNCTIONS ===
function addCharacter () {
    const character = {
        name: characterNameInput.value,
        server: serverNameInput.value
    };

    if (alreadyExists(character)) {
        centerDomNotifier.notify(`${character.name}/${character.server} is already on the list.`);
        clearAndFocus();
        return;
    }

    //validate character
    let errorMessage = '';
    if (typeof character.name !== 'string' || character.name.length < 2) {
        errorMessage += 'Character Name must be at least two letters long. ';
    }

    if (typeof character.server !== 'string' || character.server.length < 2) {
        errorMessage += 'Server Name must be at least two letters long.';
    }

    if (errorMessage.length > 0) {
        centerDomNotifier.notify(errorMessage);
        postErrorRefocus();
        return;
    }

    /**
     * Immediately place the character into the list and mark their level as PENDING
     * Make sure the relevant HTML element (li) has a unique reference to the character, so we can later update it
     */
    handleCharacterLi(character);

    ipcRenderer.send('add:character', character);

    // save server name as lastServer so we can use it between application restarts
    ipcRenderer.send('update:last-server', character.server);

    clearAndFocus();
}

/**
 * Checks whether the character already exists
 * Searches by 'character-identifier' (HTML element attribute)
 */
function alreadyExists(character) {
    const characterIdentifier = getCharacterIdentifier(character);
    const liElements = characterListElement.getElementsByTagName('LI');
    for (let i = 0; i < liElements.length; i++) {
        if (liElements[i].getAttribute('character-identifier') === characterIdentifier) {
            return true;
        }
    }

    return false;
}

/**
 * Generates a unique character identifier for the list
 * Uses character name and server name
 */
function getCharacterIdentifier (character) {
    return (character.name + character.server).replace(' ', '').toLowerCase();
}

/**
 * Accepts an 'li' element along with all the data needed to create all the sub-elements
 * Also appends the 'li' into the relevant 'ul' if needed (if it's not already there)
 */
function handleCharacterLi(character, liParam) {
    let li;
    if (liParam) {
        li = liParam;
        li.innerHTML = '';
    } else {
        li = document.createElement('li');
    }
    let bracketInfo;
    if (character.level) {
        bracketInfo = character.level;
    } else if (character.nonExistent) {
        bracketInfo = 'NOT FOUND';
    } else {
        bracketInfo = 'PENDING';
    }

    const itemText = document.createTextNode(`${character.name} (${bracketInfo}) / ${character.server} - `);
    li.appendChild(itemText);

    // TODO find a way to retain the original button (perhaps only remove the text node and use prepend?)
    const removeButton = document.createElement('button');
    const buttonText = document.createTextNode('Remove');
    removeButton.appendChild(buttonText);
    removeButton.setAttribute('purpose', 'remove');

    // used to uniquely identify the 'li' element
    const characterIdentifier = getCharacterIdentifier(character);

    removeButton.addEventListener('click', () => {
        const li = findCharacterLi(character);
        characterListElement.removeChild(li);
        checkCharacterListStatus();
        ipcRenderer.send('character:remove', character._id);
    });

    li.appendChild(removeButton);


    if (!liParam) {
        // no need to set the attribute or append to UL if the character is already on the list
        li.setAttribute('character-identifier', characterIdentifier);
        // characterListElement is accessed globally
        characterListElement.appendChild(li);
    }
}

/**
 * Checks whether the key pressed was Enter
 * If so, determines whether to shift focus from 'self' to 'other' or call addCharacter
 */
function shiftFocusOrAddCharacter(event, self, other) {
    if (event.key !== 'Enter') {
        return;
    }

    if (self.value && !other.value) {
        return other.focus();
    }

    addCharacter();
}

/**
 * Determines which input field needs to be focused after failed validation
 * Then focuses that field and selects its contents
 */
function postErrorRefocus() {
    if (serverNameInput.value.length < 2) {
        serverNameInput.focus();
        return serverNameInput.select();
    }

    if (characterNameInput.value.length < 2) {
        characterNameInput.focus();
        return characterNameInput.select();
    }
}

/**
 * Loops through character ul and locates the li that belongs to the character in question
 */
function findCharacterLi(character) {
    const characterIdentifier = getCharacterIdentifier(character);
    const liElements = characterListElement.getElementsByTagName('LI');

    for (let i = 0; i < liElements.length; i++) {
        if (liElements[i].getAttribute('character-identifier') === characterIdentifier) {
            return liElements[i];
        }
    }
}

/**
 * Clears and re-focuses character name input
 */
function clearAndFocus() {
    characterNameInput.value = '';
    characterNameInput.focus();

    enableRefresh();
}

/**
 * Checks whether the character list is empty
 * If so, it displays an appropriate message, while hiding the refresh button
 * Otherwise, it makes the refresh button visible
 */
function checkCharacterListStatus() {
    const liElements = characterListElement.getElementsByTagName('LI');
    if (liElements.length === 0) {
        characterStatusElement.innerHTML = 'You are currently not tracking any characters. Click on "Add Character" to start.';
        refreshButton.style.visibility = 'hidden';
    } else {
        enableRefresh();
    }
}

/**
 * Enables the refresh (mass fetch) button and clears 'no characters' message
 */
function enableRefresh() {
    characterStatusElement.innerHTML = '';
    refreshButton.style.visibility = 'visible';
}

/**
 * Disables/enables a specific character's (li's) 'Remove' button
 */
function toggleDisabledRemoveButton(li, disabled) {
    const button = li.getElementsByTagName('BUTTON')[0];

    button.disabled = disabled;
}
