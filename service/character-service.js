const axios = require('axios');
const { parse } = require('node-html-parser');

const fetchCharacterFromServer = async characterFromDb => {
    let unparsedCharacterData;
    try {
        unparsedCharacterData =
            await axios.get(`https://worldofwarcraft.com/en-gb/character/eu/${characterFromDb.server}/${characterFromDb.name}`);
    } catch (err) {
        return null;
    }

    const parsedCharacterData = parseCharacterData(characterFromDb, unparsedCharacterData);

    markIfDinged(characterFromDb, parsedCharacterData);

    return parsedCharacterData;
};

/**
 * Transforms character-related data received from server into a usable JSON object
 */
const parseCharacterData = (characterFromDb, unparsedCharacterData) => {
    const html = parse(unparsedCharacterData.data);
    const level = parseInt(html.childNodes[0].childNodes[0].childNodes[4].rawAttrs.split('- ')[1].split(' ')[0]);
    /**
     * If level could not be parsed for any reason, we want to assume the character does not exist in armory
     */
    if (isNaN(level)) {
        return null;
    }

    return {
        id: characterFromDb.id,
        name: characterFromDb.name,
        server: characterFromDb.server,
        level
    };
};

/**
 * Checks whether this character already has level information in db
 * If so, it compares the old level with the freshly fetched one and appends 'dinged' boolean property to the new instance
 */
const markIfDinged = (oldInstance, newInstance) => {
    if (oldInstance.level && newInstance.level > oldInstance.level) {
        newInstance.dinged = true;
    }
};

module.exports = {
    fetchCharacterFromServer,

};
