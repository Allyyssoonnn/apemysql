const db = require('./db');
const Sync = require('./Sync/Sync');

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

async function sincronizar(path) {
    try {
        await Sync(path);
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
}