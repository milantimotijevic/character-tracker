const fetchCharacterFromServer = async characterFromDb => {
    //faking a call to the server
    const unparsedCharacterData = await new Promise((resolve, reject) => {
        resolve(characterFromDb);
    });

    //faking the parsing process
    //TODO create helper method for the actual parsing/scraping process
    const parsedCharacterData = {
        id: characterFromDb.id,
        name: unparsedCharacterData.name,
        player: unparsedCharacterData.player,
        server: unparsedCharacterData.server,
        level: unparsedCharacterData.level ? unparsedCharacterData.level : 1
    };

    markIfDinged(characterFromDb, parsedCharacterData);

    return parsedCharacterData;
};

/**
 * Checks whether this character already has level information in db
 * If so, it compares the old level with the freshly fetched one and appends 'dinged' boolean property to the new instance
 */
const markIfDinged = (oldInstance, newInstance) => {
    if (oldInstance.level && newInstance.level ? oldInstance.level) {
        newInstance.dinged = true;
    }
};

// TODO add character validator

module.exports = {
    fetchCharacterFromServer,

};
