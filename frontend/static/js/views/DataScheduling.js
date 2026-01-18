import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  result = "No Result";

  constructor(params) {
    super(params);
    this.setTitle("Demandas");

    this.doc = {};
  }

  async getMenu() {
    let row = ``;
    row += `
                <ul class="nav nav-tabs justify-content-center">                
                <li class="nav-item">
                        <a class="nav-link" href="/dashboard/scheduler">Início</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="#">Demandas</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/schedulingPhase">Agendamento</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/authorizationPhase/list">Aguardando Autorização</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/unauthorizedPhase/list">Não Comparecidos</a>
                    </li>
                    `;
    row += `</ul>`;

    return row;
  }

  async init() {
    if (get_property_from_storage("user") == "") {
      window.open("/user/login", "_self");
    }
  }

  async getHtml() {
    return `
    
 <style>

    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
    }
    .container {
      max-width: 90%;
      margin: 2rem auto;
    }
    .page-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: var(--bs-primary);
      font-size: 1.8rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .page-title .bi {
      font-size: 2rem;
      transition: transform 0.3s ease;
    }
    .page-title:hover .bi {
      transform: rotate(20deg) scale(1.1);
    }
    .tree > details {
      background: #ffffff;
      border-left: 4px solid var(--bs-primary);
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 12px rgba(13, 110, 253, 0.1);
      transition: box-shadow 0.3s, transform 0.3s;
    }
    .tree > details:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(13, 110, 253, 0.15);
    }
    .tree > details > summary {
      list-style: none;
      padding: 1.25rem 1.5rem;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 1.125rem;
    }
    .tree summary::-webkit-details-marker { display: none; }
    .tree summary .bi {
      transition: transform 0.3s, color 0.3s;
      font-size: 1.5rem;
      color:rgb(49, 64, 77);
    }
    .tree details[open] > summary .bi {
      transform: rotate(180deg);
      color: var(--bs-primary);
    }
    .tree details > ul {
      overflow: hidden;
      transform-origin: top;
      padding-left: 1.5rem;
      margin: 0.5rem 0 1rem;
      list-style: none;
    }
    .tree details > ul li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      background:rgb(255, 255, 255);
      margin-bottom: 0.5rem;
      margin-right: 0.6rem;
      font-weight: 600;
      cursor: pointer;
    }

    .tree details > ul li:hover {
      background: var(--bs-primary);
      color: #fff;
    }

    /* Nível 1: serviços (details diretos dentro de .tree) */
    .tree > details {
      border-left: 4px solid var(--bs-primary);
    }

    /* Nível 2: tipos (details dentro de detalhes) */
    .tree > details details {
      border-left: 4px solid var(--bs-success);
    }

    /* Nível 3: requisitionDetails (details dentro de details dentro de details) */
    .tree > details details details {
      border-left: 4px solid var(--bs-warning);
    }

    /* Nível 4+: se houver mais níveis, continua o mesmo padrão */
    .tree > details details details details {
      border-left: 4px solid var(--bs-danger);
    }

    /* ———————————————————————————————————————————————— */
    /* Para os <li> que você cria (níveis alternativos de lista): */

    /* Tipo (nível 2, <ul class="nested"> > li) */
    .tree .nested > li {
      border-left: 4px solid var(--bs-warning);
      padding-left: 1rem; /* ajuste de espaçamento interno */
    }

    /* Requisições (nível 3, <ul class="nested nested"> > li) */
    .tree .nested .nested > li {
      border-left: 4px solid var(--bs-success);
      padding-left: 1rem;
    }

    /* Se você tiver um nível 4 de <li> */
    .tree .nested .nested .nested > li {
      border-left: 4px solid var(--bs-danger);
      padding-left: 1rem;
    }  

</style>

  <div class="container">
    <h2 class="page-title">
      <i class="bi bi-calendar3"></i>
      Pendências de Agendamento
    </h2>
    <div class="tree" id="unitsContainer"></div>
  </div>

    <img style="display:none" onload="showViewDataScheduling()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">
  `;
  }
}
