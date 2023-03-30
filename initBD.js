const fs = require('fs');
const extract = require('extract-zip');
const mysql = require('mysql');
const child_process = require('child_process');
const cmd = require('node-cmd');
const EventEmitter = require('events');

module.exports = function initBD(dir, dirzip, port, nameService, bd) {
    try {
        const event = new EventEmitter();

        cmd.run('NET SESSION', resp => {
            if (resp?.code === 2) {
                event.emit('error', '[InitBD] - Sem permissão de administrador');
                event.emit('end');
            } else {
                //Verificando pasta se existe retorna
                event.emit('log', 'Verificando pastas');
                if (fs.existsSync(dir)) {
                    event.emit('error', '[InitBD] - Pasta já existe');
                    event.emit('end');
                } else {
                    event.emit('log', 'Criando pastas');
                    fs.mkdirSync(dir);
                    //Copia arquivo zip para pasta
                    event.emit('log', 'Copiando arquivos');
                    fs.copyFileSync(dirzip, `${dir}/mysql.zip`);
                    
                    //Extrai o arquivo zip
                    event.emit('log', 'Organizando arquivos');
                    unzip(dir)
                    .then(() => {
                        //Cria my.ini
                        event.emit('log', 'Quase lá');
                        getIni(dir, port)
                        .then(() => {
                            //Cria bat de inicio
                            getBat(dir, nameService)
                            .then(() => {
                                //Cria Banco de dados
                                event.emit('log', 'Finalizando');
                                criaBD(bd)
                                .then(() => event.emit('end', ''));
                            });
                        });
                    })
                }
            }
        });

        return event;
    } catch (error) {
        return { status: false, error }
    }
}

async function unzip(dir) {
    return new Promise((res, rej) => {
        extract(`${dir}/mysql.zip`, { dir: dir })
        .then(() => res(true))
        .catch((err) => { console.log(err), rej(err) })
    });
}

async function criaBD(bd) {
    const conn = mysql.createConnection({
        host: 'localhost',
        port: 3309,
        user: 'root',
        password: '',
        database: '',
    });

    return new Promise((res, rej) => {
        conn.connect(async (err) => {
            if (err) rej(err);
            conn.query(`SET PASSWORD FOR 'root'@'localhost' = '2022@Ape#'`, [], (error) => { if (error) rej(error) });
            conn.query(`UPDATE mysql.user SET HOST = '%' WHERE user = 'root'`, [], (error) => { if (error) rej(error) });
            conn.query(`CREATE DATABASE ${bd}`, [], (error) => { if (error) rej(error) });
            res();
        })
    })
}

async function getBat(dir, nameService) {
    const bat = `chcp 65001
        cd ${invertBar(`${dir}/mysql/bin`)}
        mysqld --defaults-file="${invertBar(`${dir}/my.ini`)}" --initialize-insecure
        mysqld --install ${nameService} --defaults-file="${invertBar(`${dir}/my.ini`)}"
        net start ${nameService}
        `
    ;

    const batStop = `
        net stop ${nameService}
        sc delete ${nameService}
    `;
    fs.writeFileSync(`${dir}/mysql.bat`, bat);
    fs.writeFileSync(`${dir}/desintala.bat`, batStop);
    return new Promise((res, rej) => {
        const batexec = child_process.spawn('cmd.exe', ['/c', `${dir}/mysql.bat`]);

        batexec.on('close', (code, signal) => {
            res(true);
        })
        batexec.on('error', err => {
            throw err;
            // if (err) rej(err);
        })
    })
}

async function getIni(dir, port) {
    
    const basedir = invertBar(`${dir}/mysql`);
    const datadir = invertBar(`${dir}/data`);

    const myini = `[mysqld]

        basedir = ${basedir}
        datadir = ${datadir}

        port=${port}

        character-set-server=utf8
        default-storage-engine=MyISAM

        sql-mode="STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION"

        log-output=FILE

        general-log=0
        general_log_file="mysql.log"

        slow-query-log=1
        slow_query_log_file="mysql-slow.log"
        long_query_time=10

        log-error="mysql.err"

        max_connections=10000
        query_cache_size=0
        table_open_cache=2000
        tmp_table_size=11M
        thread_cache_size=10
        myisam_max_sort_file_size=100G
        myisam_sort_buffer_size=14M
        key_buffer_size=8M
        read_buffer_size=27K
        read_rnd_buffer_size=256K

        sort_buffer_size=256K
        join_buffer_size=256K
        back_log=80
        flush_time=0
        max_allowed_packet=4M
        max_connect_errors=100
        open_files_limit=4161
        query_cache_type=0
        table_definition_cache=1400
        binlog_row_event_max_size=8K
        sync_master_info=10000
        sync_relay_log=10000
        sync_relay_log_info=10000
        server_id = 32
        `
    ;

    fs.writeFile(`${dir}/my.ini`, myini, { encoding: 'ascii' },
    err => {
        if (err) return { status: false }
        return { status: true }
    })
}

function invertBar(str) {
    var newstr = '';
    for (let i = 0; i < str.length; i++) (str.substr(i, 1) === '\\') ? newstr = newstr + '/' : newstr = newstr + str.substr(i, 1);
    return newstr;
}