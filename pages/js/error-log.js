const { ipcRenderer } = require('electron');
const errorsElement = document.getElementById('errors-element');

ipcRenderer.on('show:errors', (event, errors) => {
    errorsElement.value = JSON.stringify(errors);
});

const copyButton = document.getElementById('copy-button');
copyButton.addEventListener('click', () => {
    errorsElement.select();
    document.execCommand('copy');
});

const closeButton = document.getElementById('close-button');
closeButton.addEventListener('click', () => {
    ipcRenderer.send('errors-page:close');
});
