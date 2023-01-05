
class EntitySync {

    constructor(tab) {
        this.tab = tab;
    }


    

    /**
     * @return {Field[]} Lista de fields com os tipos.
     */
    getFields() {
    // Filhos devem implementar
    }

    /**
     * @return {Field[]} Lista de indices.
     */
    getIndex() {
    // Filhos devem implementar
    }

}

module.exports = EntitySync;