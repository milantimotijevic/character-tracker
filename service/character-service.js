const axios = require('axios');

const fetchCharacterFromServer = async characterFromDb => {
    const unparsedCharacterData =
        await axios.get(`https://worldofwarcraft.com/en-gb/character/eu/${characterFromDb.server}/${characterFromDb.name}`);

    const parsedCharacterData = parseCharacterData(characterFromDb, unparsedCharacterData);

    markIfDinged(characterFromDb, parsedCharacterData);

    return parsedCharacterData;
};

/**
 * Transforms character-related data received from server into a usable JSON object
 */
const parseCharacterData = (characterFromDb, unparsedCharacterData) => {
    const level = 1; // TODO extract from unparsedCharacterData

    //TODO check if 404 and return null

    return {
        id: characterFromDb.id,
        name: characterFromDb.name,
        player: characterFromDb.player,
        server: characterFromDb.server,
        level,
        meta: unparsedCharacterData
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

// TODO add character validator

module.exports = {
    fetchCharacterFromServer,

};
