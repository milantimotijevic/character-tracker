const axios = require('axios');
const { parse } = require('node-html-parser');

/**
 * Fetches character from Armory, parses its information, marks it as Dinged if needed and executes CB
 */
const fetchCharacterFromServer = async (characterFromDb, cb) => {
    let armoryHTML;
    try {
        armoryHTML =
            await axios.get(`https://worldofwarcraft.com/en-gb/character/eu/${characterFromDb.server}/${characterFromDb.name}`);
    } catch (err) {
        return null;
    }

    const parsedCharacterData = parseCharacterData(characterFromDb, armoryHTML.data);

    markIfDinged(characterFromDb, parsedCharacterData);

    cb(parsedCharacterData);
};

/**
 * Transforms character-related data received from server into a usable JSON object
 */
const parseCharacterData = (characterFromDb, unparsedCharacterData) => {
    const html = parse(unparsedCharacterData);
    let level = parseInt(html.childNodes[0].childNodes[0].childNodes[4].rawAttrs.split('- ')[1].split(' ')[0]);

    if (!Number.isInteger(level)) {
        level = undefined;
    }

    return {
        _id: characterFromDb._id,
        name: characterFromDb.name,
        server: characterFromDb.server,
        level,
        nonExistent: !level
        //'undefined' level will signal to our page that the character does not exist
    };
};

/**
 * Checks whether this character already has level information in db
 * If so, it compares the old level with the freshly fetched one and appends 'dinged' boolean property to the new instance
 */
const markIfDinged = (oldInstance, newInstance) => {
    if (oldInstance.level && newInstance.level && newInstance.level > oldInstance.level) {
        newInstance.dinged = true;
    }
};

module.exports = {
    fetchCharacterFromServer,

};
