
class Field {

    constructor(name) {
        this.name = name;
    }

    pk() {
        this.isPk = true;
        return this;
    }

    unique() {
        this.uniqueValue = true;
        return this;
    }
    
    index(indexName, indexType) {
        this.indexName = indexName;
        this.indexType = indexType;
        return this;
    }

    default(value) {
        this.valueDefault = value;
        return this;
    }


    //tipo do campo

    int(size) {
        this.type = 'int';
        this.sizeField = size || 6;
        return this;
    }

    integer(size) {
        this.type = 'int';
        this.sizeField = size || 6;
        return this;
    }

    varchar(size) {
        this.type = 'varchar';
        this.sizeField = size || 255;
        return this;
    }

    enum() {
        this.type = 'enum';
        this.enumValues = '';
        for (let i = 0; i < arguments.length; i++) {
            this.enumValues += ('"' + arguments[i] + '", ');
        }
        this.enumValues = this.enumValues.substring(0, this.enumValues.length - 2);
        return this;
    }

    date() {
        this.type = 'date';
        return this;
    }

    time() {
        this.type = 'time';
        return this;
    }

    datetime() {
        this.type = 'datetime';
        return this;
    }

    double(size) {
        this.type = 'double';
        this.sizeField = size || '12,2';
        return this;
    }

    notnull() {
        this.notnull = true;
        return this;
    }

    text() {
        this.type = 'text';
        return this;
    }
}

module.exports = (nome) => {
    return new Field(nome);
}