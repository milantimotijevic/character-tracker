const axios = require('axios');
const { parse } = require('node-html-parser');
const { db } = require('../database');

/**
 * Fetches character from Armory, parses its information, marks it as Dinged if needed and executes CB
 * Also saves it in DB
 */
const fetchCharacterFromServer = async (characterFromDb, cb) => {
    let armoryHTML;
    try {
        armoryHTML =
            await axios.get(`https://worldofwarcraft.com/en-gb/character/eu/${characterFromDb.server}/${characterFromDb.name}`);
    } catch (err) {
        // prevent axios from throwing; later method calls will handle bad HTML format
        armoryHTML = { data: null };
    }

    let parsedCharacterData = parseCharacterData(characterFromDb, armoryHTML.data);

    const dinged = hasDinged(characterFromDb, parsedCharacterData);
    // upsert character into DB
    db.characters.update({ _id: parsedCharacterData._id },
        {
            name: parsedCharacterData.name,
            server: parsedCharacterData.server,
            level: parsedCharacterData.level,
            nonExistent: parsedCharacterData.nonExistent
        }, { upsert: true });

    // re-fetch by name/server name to ensure we capture the _id property in case of an upsert
    parsedCharacterData = db.characters.find({ name: parsedCharacterData.name, server: parsedCharacterData.server })[0];
    parsedCharacterData.dinged = dinged;

    cb(parsedCharacterData);
};

/**
 * Transforms character-related data received from server into a usable JSON object
 */
const parseCharacterData = (characterFromDb, unparsedCharacterData) => {
    const html = parse(unparsedCharacterData);
    let level;
    try {
        level = parseInt(html.childNodes[0].childNodes[0].childNodes[4].rawAttrs.split('- ')[1].split(' ')[0]);
    } catch (err) {
        level = undefined;
    }

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
 * If so, it compares the old level with the freshly fetched one and returns true/false depending on whether the new value is higher
 */
const hasDinged = (oldInstance, newInstance) => {
    return oldInstance.level && newInstance.level && newInstance.level > oldInstance.level;
};

module.exports = {
    fetchCharacterFromServer,

};
