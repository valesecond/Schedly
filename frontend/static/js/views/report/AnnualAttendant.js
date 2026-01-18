import AbstractView from "../AbstractView.js";

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Relatório de Atendimentos");
    }

    async getHtml() {
        const today = new Date();
        const year_c = today.getFullYear();
        const year_b = year_c - 1;

        return `

        <style>
             .spec-card {
             flex: 1 1 140px;
                min-width: 140px;
                max-width: 200px;
                cursor: pointer;
                transition: box-shadow 0.3s ease;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
                background-color: #fff;
            }

            /* Cards dos meses no footer */
            .month-card {
                cursor: pointer;
                border-radius: 8px;
                box-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
                background-color: #f8f9fa;
                transition: background-color 0.3s ease, color 0.3s ease;
            }

            .day-card {
                flex: 1 1 140px;
                min-width: 140px;
                max-width: 200px;
                border-radius: 8px;
                box-shadow: 0 1px 4px rgb(0 0 0 / 0.1);
                background-color: #ffffff;
                cursor: default;
                transition: box-shadow 0.2s ease;
            }

            .day-card:hover {
                box-shadow: 0 4px 8px rgb(0 0 0 / 0.15);
            }

            .day-card .card-header {
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                padding: 0.5rem 1rem;
                font-weight: 600;
                text-align: center;
            }

            .day-card .card-body {
                padding: 0.75rem 1rem;
                text-align: center;
                font-size: 1.25rem;
                font-weight: 500;
                color: #333;
            }

            .card-footer.p-0 {
                background-color: #fff !important;
                height: 250px; /* maior altura para melhor visual */
                overflow-y: auto;
                overflow-x: hidden;
                padding: 1rem;
            }

            /* Ajuste dos títulos para uppercase */
            .card-title {
                text-transform: uppercase;
            }

        </style>

        <ul class="nav nav-pills">
            <li class="nav-item">
                <a class="nav-link ${this.params.year == year_b ? "active" : ""}" href="/report/annualAttendant/${year_b}">${year_b}</a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${this.params.year == year_c ? "active" : ""}" href="/report/annualAttendant/${year_c}">${year_c}</a>
            </li>
        </ul>
        <div id="attendant"></div>
        <img onload='updateAnnualAttendantReport(${this.params.year})' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='>
        `;
    } 

    getMenu() {
        let row = `
        <ul class="nav nav-tabs justify-content-center">
            <li class="nav-item">
                <a class="nav-link" href="/dashboard/manager">Ao Gestor</a>
            </li>
            <li class="nav-item">
                <a class="nav-link active" href="#">Atendidos por Especialidade</a>
            </li>`;
        row += super.getMenu();
        row += `</ul>`;
        return row;
    }

    async init() {
    }
}
