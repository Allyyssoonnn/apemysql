const mysql = require('mysql');

//Passei para global.pool pois estava gerando desconexão quando atualizava o app do garçom
// let pool = null;

function Connect(data) {
  global.database = data;
    return new Promise((resolve, reject) => {

        const conn = mysql.createConnection({
            host: data.host,
            port: data.port,
            user: data.user,
            password: data.password,
            database: data.database
        });
    
        conn.connect((err) => {
            if (err) {
                resolve({
                    status: false,
                    code: err.code,
                    msg: err.message
                })
            } else {
                const database = mysql.createPool({
                    host: data.host,
                    port: data.port,
                    user: data.user,
                    password: data.password,
                    database: data.database,
                    //Limitar conexão limite da pool para que o modulo não tente criar muitas conexões com o banco que aceita apenas em torno de 150 no Mysql55 após isso extoura erro de too many connections
                    //Pois a pool tem limite maior do que o banco
                    //Deixando o limite baixo a pool vai colocar as requisições em espera e realizar elas em 10 conexões com o banco de dados
                    connectionLimit: 50
                });
                global.pool = database;
                resolve({
                    status: true
                })
            }
        })

        conn.on('error', err => {
            console.log('db Error', err);
            HandleDisconnect();
        });

    })

}

function HandleDisconnect() {
    const data = global.database;

    const conn = mysql.createConnection({
        host: data.host,
        port: data.port,
        user: data.user,
        password: data.password,
        database: data.database
    });

    conn.connect(err => {
        if (err) {
            console.log('Erro em recria conexão!');
        }
    });

    conn.on('error', err => {
        console.log('db Error', err);
        HandleDisconnect();
    });
}

function Disconnect() {
    try {
        global.pool = null;
    } catch (error) {
        console.log('Erro desconectar base de dados ' + error);
    }
}

// function criarconexao(dados) {
//     try {
//         const database = mysql.createPool({
//             host: dados.host,
//             port: dados.port,
//             user: dados.user,
//             password: dados.password,
//             database: dados.database,
//         });
//         pool = database;
//         pool.on('error', (err) => {
//             console.log('ERRO POLL ', err);
//         });

//     } catch (error) {
//         console.log('Erro conectar base de dados ' + error);
//     }
// }

/**
 * Realiza uma query e retorna os resultados. Caso não seja especificado a conexão
 * no último parâmetro a query irá ser realizada com a variável pool.
 * @param {String} sql O Sql a ser executado.
 * @param {Object|Array} params Os parâmetros do sql.
 * @param {Connection} connection Conexão opcional do mysql.
 */
 function query(sql, params, connection) {
    return new Promise((resolve, reject) => {
      global.pool.query(sql, params, (err2, res) => {
        if (err2) {
          // console.log(err2);
          reject(err2);
        } else {
          resolve(res);
        }
      });
      // co(function* () {
      //   let conn = connection;
      //   if (!conn) {
      //     conn = yield getConnection();
      //   }
      //   conn.query(sql, params, (err2, res) => {
      //     if (!connection) {
      //       // Só podemos liberar se foi criado agora a conexão
      //       conn.release();
      //     }
      //     if (err2) {
      //       // console.log(err2);
      //       reject(err2);
      //     } else {
      //       resolve(res);
      //     }
      //   });
      // }).catch(console.log);
    });
}

async function querySilent(sql, params, connection) {
  try {
    return await query(sql, params, connection);
  } catch (ex) {
    //
  }
}

/**
 * Realiza uma query e retorna o primeiro registro.
 * @see query
 */
 async function queryFindOne(sql, params, connection) {
    const ret = await query(sql, params, connection);
    return ret[0];
}

/**
 * Retorna uma conexão do POOL de conexões padrão no pool.
 * @param {Number} tentativas O Numero de tentativas de pegar uma conexão, caso atinja
 *  3 o método rejeita a execução e levanta um erro.
 */
 function getConnection(tentativas) {
  return new Promise((resolve, reject) => {
    if (!tentativas) {
      tentativas = 0;
    }
    try {
      global.pool.getConnection((err, conn) => {
        if (err) {
          if (tentativas === 3) {
            reject(err);
          }
          return getConnection(tentativas + 1);
        }
        resolve(conn);
      });
    } catch (error) {
      Connect(global.database);
      console.log('[DBUTILS] FALHA NA POOL');
      if (tentativas === 3) {
        reject(error);
      } else {
        return getConnection(tentativas + 1);
      }

    }

  });
}

async function checarSeTabelaExiste(table) {
  try {
      const cursor = await query('show tables like "' + table + '"');
      return (cursor.length > 0);
  } catch (ex) {
      console.log(ex);
      throw ex;
  }
}

async function getCamposTabela(dbName, tabela) {
try {
  const fields =
    await query(
      ` 
      select 
      COLUMN_NAME as col,
      CHARACTER_MAXIMUM_LENGTH as size,
      DATA_TYPE as type
      from
        information_schema.COLUMNS a 
      where 
        a.TABLE_NAME = ?
        and a.TABLE_SCHEMA = ?
      `,
      [tabela, dbName]);
  // const colunas = fields.colunas;
  // return (colunas.split(','));
      const array = [];
      for(const coluna of fields) {
        // array.push(coluna.col);
        array.push({ col: coluna.col, size: coluna.size, type: coluna.type });
      }


  return array;
} catch (ex) {
  console.log(ex);
  throw ex;
}
}

exports.Connect = Connect;
// exports.criarconexao = criarconexao;
exports.Disconnect = Disconnect;
exports.query = query;
exports.querySilent = querySilent;
exports.queryFindOne = queryFindOne;
exports.getConnection = getConnection;
exports.checarSeTabelaExiste = checarSeTabelaExiste;
exports.getCamposTabela = getCamposTabela;