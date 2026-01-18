import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    result = "No Result";

    constructor(params) {
        super(params);
        this.setTitle("Fase de Autorização");

        this.doc = this.getDefaultDoc();
        this.init();
    }

    getDefaultDoc() {
        return {
            _key: ""
        };
    }

    async getMenu() {
        let row = ``
        row = `
            <ul class="nav nav-tabs justify-content-center">
                <li class="nav-item">
                    <a class="nav-link" href="/reception/list/1">Em Atendimento</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link  active" href="#">Autorização</a>
                </li>                
                <li class="nav-item">
                    <a class="nav-link" href="/reception/new">Novo Atendimento</a>
                </li>`
            row+=super.getMenu()
            row+=`</ul>`
        ;
        return row;
    }

    async init() {
        const _key = this.params._key;
            const response = await fetchData(`/authorization/${_key}`, "GET");
            console.log("response");
            console.log(response);
            
            this.doc.ficha = response.authorization;
            console.log(this.doc.ficha);
    }

    async getHtml() {
        console.log(this.doc);
        
        let row = `
        <div class="card">
            <embed src="data:application/pdf;base64,${this.doc.ficha}" type="application/pdf" width="100%" height="600px" />
        </div>
    `;

        return row;
    }
}
