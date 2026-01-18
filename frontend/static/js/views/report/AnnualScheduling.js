import AbstractView from "../AbstractView.js";

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Relatório de Agendamentos");
    }

    async getHtml() {
        const today = new Date();
        const year_c = today.getFullYear();
        const year_b = year_c - 1;

        return `
        <ul class="nav nav-pills">
            <li class="nav-item">
                <a class="nav-link ${this.params.year == year_b ? "active" : ""}" href="/report/annualScheduling/${year_b}">${year_b}</a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${this.params.year == year_c ? "active" : ""}" href="/report/annualScheduling/${year_c}">${year_c}</a>
            </li>
        </ul>

        <div id="scheduling-calendar"></div>
        <img onload='updateAnnualSchedulingReport(${this.params.year})' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='>
               `;
    }

    getMenu() {
        let row = `
        <ul class="nav nav-tabs justify-content-center">
            <li class="nav-item">
                <a class="nav-link" href="/dashboard/manager">Ao Gestor</a>
            </li>
            <li class="nav-item">
                <a class="nav-link active" href="#">Agendamentos por Especialidade</a>
            </li>`;
        row += super.getMenu();
        row += `</ul>`;
        return row;
    }

    async init() {
        // qualquer JS extra de inicialização aqui
    }
}
