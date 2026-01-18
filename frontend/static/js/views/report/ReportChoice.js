import AbstractView from "../AbstractView.js";

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Selecione o Relatório");
    }

    async getHtml() {
        return `
        <div class="container mt-5">
            <div class="row justify-content-center mb-4">
                <h2 class="text-center text-primary">
                    <i class="bi bi-bar-chart-fill me-2"></i>
                    Relatórios
                </h2>            
            </div>
            <div class="row justify-content-center g-4">
                <div class="col-12 col-md-4">
                    <a href="/report/annualRequest/${new Date().getFullYear()}" class="btn btn-outline-primary btn-lg w-100 p-4 shadow-sm d-flex flex-column align-items-center justify-content-center hover-scale">
                        <i class="bi bi-file-earmark-text mb-2" style="font-size: 2rem;"></i>
                        <span>Requisições</span>
                    </a>
                </div>
                <div class="col-12 col-md-4">
                    <a href="/report/annualScheduling/${new Date().getFullYear()}" class="btn btn-outline-success btn-lg w-100 p-4 shadow-sm d-flex flex-column align-items-center justify-content-center hover-scale">
                        <i class="bi bi-calendar-check mb-2" style="font-size: 2rem;"></i>
                        <span>Agendamentos</span>
                    </a>
                </div>
                <div class="col-12 col-md-4">
                    <a href="/report/annualAttendant/${new Date().getFullYear()}" class="btn btn-outline-danger btn-lg w-100 p-4 shadow-sm d-flex flex-column align-items-center justify-content-center hover-scale">
                        <i class="bi bi-people mb-2" style="font-size: 2rem;"></i>
                        <span>Atendimentos</span>
                    </a>
                </div>
            </div>
        </div>
        `;
    }

    getMenu() {
        let row = `
        <ul class="nav nav-tabs justify-content-center">
            <li class="nav-item">
                <a class="nav-link" href="/dashboard/manager">Ao Gestor</a>
            </li>
            <li class="nav-item">
                <a class="nav-link active" href="#">Relatório</a>
            </li>`;
        row += super.getMenu();
        row += `</ul>`;
        return row;
    }

    async init() {
        const style = document.createElement('style');
        style.innerHTML = `
        .hover-scale { transition: transform 0.2s ease; }
        .hover-scale:hover { transform: scale(1.05); }
        `;
        document.head.appendChild(style);
    }
}
