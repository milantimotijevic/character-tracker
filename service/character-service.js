const fetchCharacterFromServer = async character => {
    //faking a call to the server
    const unparsedCharacterData = await new Promise((resolve, reject) => {
        resolve(character);
    });

    //faking the parsing process
    return {
        id: character.id,
        name: unparsedCharacterData.name,
        player: unparsedCharacterData.player,
        server: unparsedCharacterData.server,
        level: unparsedCharacterData.level ? unparsedCharacterData.level : 1
    };
};

// TODO add character validator

const characterAlreadyExists = (characterData, db) => {
    return db.characters.find({ name: characterData.name, server: characterData.server });
};

module.exports = {
    fetchCharacterFromServer,

};
