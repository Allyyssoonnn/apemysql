const fs = require('fs');
const path = require('path');
const EntitySync = require('./EntitySync');
const db = require('../db');
const _ = require('lodash');

function log(msg) {
    console.log(msg);
    const date = new Date();
    const datelog = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth()).padStart(2, '0')}`;
    const hourlog = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    const infolog = `${datelog} - ${hourlog} * `;
    // fs.writeFile('syncbd-log.txt', infolog + msg + '\n', {
    //     flag: 'a+',
    // }, (err) => {
    //     if (err) console.log('Erro em registrar log\n' + err);
    // });
}

async function Sync(database, path) {
    try {
        
        log(`[SYNC] INICIANDO SYNC BASE=${database}`);

        const entitys = fs.readdirSync(path);

        for (let i = 0; i < entitys.length; i++) {
            
            const Archive = require(path + '/' + entitys[i]);
            const instance = new Archive();

            if (instance instanceof EntitySync) {
                await SyncTab(instance, database);
            }
            
        }

        log('[SYNC] FINALIZADO');

    } catch (error) {
        log(error)
    }
}

async function SyncTab(entity, database) {

    const tab = entity.tab;
    const fields = entity.getFields();
    var camposDropados = 0;
    var camposAdicionados = 0;

    const tabExist = await db.checarSeTabelaExiste(tab);

    //Cria tabela caso ela não exista
    if (!tabExist) {
        log(`[SYNCTAB] ${tab} não existe, criando...`);
        let sql = `CREATE TABLE IF NOT EXISTS ${tab} (`;

        for (let i = 0; i < fields.length; i++) {
            sql += _getSqlCreateField(fields[i]) + ', ';
        }

        sql = sql.substring(0, sql.length - 2) + ') ';
        await db.query(sql);

        log(`[SYNCTAB] ${tab} criada`);

        //Verifica campo unique
        for (let i = 0; i < fields.length; i++) {
            if (fields[i].uniqueValue) {
                await db.querySilent('DROP INDEX ' + fields[i].name + ' ON ' + tab);
                await db.query('ALTER TABLE ' + tab + ' ADD UNIQUE (' + fields[i].name + ')');                
            }
        }        

        await setIndex(entity);
        return;
    }

    await setIndex(entity);

    //Remove os campos que não existem na receita da tabela
    const fieldsTab = await db.getCamposTabela(database, tab);
    for (let i = 0; i < fieldsTab.length; i++) {
        const fildExist = _.find(fields, (q) => {
            return q.name === fieldsTab[i].col;
        });

        if (!fildExist) {
            camposDropados += 1;
            await db.query('alter table ' + tab + ' drop column ' + fieldsTab[i].col);
        }
    }

    //Adiciona os campos que não existem na base mas estão na receita da tabela
    for (let i =0; i < fields.length; i++) {
        const res = await db.query('show fields from ' + tab + ' like "' + fields[i].name + '"');

        if (res && res.length === 0) {
            //Campo não existe
            camposAdicionados += 1;

            const field = fields[i];
            const sql = 'ALTER TABLE ' + tab + ' ADD COLUMN ' + _getSqlCreateField(field);

            await db.query(sql);
        }
    }


    // Log informativo:
    if (camposAdicionados === 0 && camposDropados === 0) {
        // console.log('- Sincronização da tabela ' + tabela + ' terminou, não foi necessário modificá-la!');
    } else {
        console.log('- Sincronização da tabela ' + tab + ' terminou, foi necessário ' +
            'derrubar ' + camposDropados + ' campos e adicionar ' + camposAdicionados + ' campos!');
    }    

}

function _getSqlCreateField(field) {
    let sql = '';

    if (field.isPk) {
        sql = ('`' + field.name + '` int(6) PRIMARY KEY AUTO_INCREMENT NOT NULL');
    } else if (field.type === 'enum') {

        sql += '`' + field.name + '` ';
        sql += field.type + '(' + field.enumValues + ') ';
        if (field.valueDefault) {
            sql += 'default "' + field.valueDefault + '"';
        }

    } else {
        sql += '`' + field.name + '` ';

        if (field.sizeField) {
            sql += field.type + '(' + field.sizeField + ') ';
        } else {
            sql += field.type + ' ';
        }

        if (field.notnull == true) {
            sql += ' not null ';
        } else {
            sql += ' null ';
        }

        if (field.valueDefault || field.valueDefault === 0) {
            sql += 'default "' + field.valueDefault + '"';
        }

    }

    return sql;
}

async function setIndex(entity) {
    if (entity.getIndex) {
        try {
            const index = entity.getIndex();

            if (index) {
                for (let i = 0; i < index.length; i++) {
                    
                    await db.querySilent('DROP INDEX ' + index[i].indexName + ' ON ' + entity.tab);
                    await db.query('ALTER TABLE ' + entity.tab + ' ADD ' + index[i].indexType + ' `' + index[i].indexName + '` (`' + index[i].name + '`)');
                }
            }
        } catch (error) {
            console.log(error)
        }
    }
}

module.exports = Sync;