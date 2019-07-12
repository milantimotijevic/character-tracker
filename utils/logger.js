const init = db => {
    return {
        error: (data) => {
            createLog(db, 'ERROR', data)
        },
        info: (data) => {
            createLog(db, 'INFO', data)
        }
    }
};

const createLog = (db, type, data) => {
    db.logs.save({
        created_at: new Date(),
        type,
        data
    });
};

module.exports = {
    init
};
