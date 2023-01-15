const db = require('./db');
const Sync = require('./Sync/Sync');
const initBD = require('./initBD');

async function conectar(host, port, user, password, database) {
    const statusconn = await db.Connect({
        host,
        port,
        user,
        password,
        database
    })
    if (!statusconn.status) console.log('Erro em conectar banco de dados');
    return statusconn.status;
};

async function sincronizar(database, path) {
    try {
        await Sync(database, path);
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

module.exports = {
    conectar,
    sincronizar,
    query: db.query,
    queryFindOne: db.queryFindOne,
    insertTable: db.insertTable,
    updateTable: db.updateTable,
    setQuery: db.setQuery,
    initBD: initBD
}