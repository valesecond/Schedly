import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  constructor(params) {
    super(params);
    this.setTitle("AgendaSaúde");
  }

  async getMenu() {
    return `
      <ul class="nav nav-tabs justify-content-center flex-wrap text-center">
        <li class="nav-item">
          <a class="nav-link" href="/dashboard/transportManager">Início</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/transportPhase/list">Criar Viagens</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/transportPhase/travelPending/list">Viagens Pendentes</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/transportPhase/travelMade/list">Viagens Concluídas</a>
        </li>
        <li class="nav-item">
          <a class="nav-link active" href="#">Histórico de Viagens</a>
        </li>
        ${super.getMenu()}
      </ul>
    `;
  }

  async init() {
    if (get_property_from_storage("user") == "") {
      window.open("/user/login", "_self");
    }
  }

  async getHtml() {
    return `
      <div class="container py-3" style="max-width:1100px;">
        <h2 class="d-flex align-items-center justify-content-center gap-2 text-primary mb-3">
          <i class="bi bi-clock-history"></i>
          Histórico de Viagens
        </h2>

        <div class="card shadow-sm border-0 rounded-4 mb-3">
          <div class="card-body p-3">
            <div class="row g-2 align-items-end">
              <div class="col-md-3">
                <label class="form-label mb-1">Unidade</label>
                <select id="fltUnitHist" class="form-select">
                  <option value="">Todas</option>
                </select>
              </div>

              <div class="col-md-2">
                <label class="form-label mb-1">Data</label>
                <input id="fltDateHist" type="date" class="form-control" />
              </div>

              <div class="col-md-3">
                <label class="form-label mb-1">Serviço</label>
                <select id="fltServiceHist" class="form-select">
                  <option value="">Todos</option>
                </select>
              </div>

              <div class="col-md-2">
                <label class="form-label mb-1">Status</label>
                <select id="fltStatusHist" class="form-select">
                  <option value="">Todos</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="REALIZADA">Realizada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>

              <div class="col-md-2 d-flex gap-2">
                <button id="btnApplyHist" class="btn btn-primary w-100">
                  <i class="bi bi-search me-1"></i> Buscar
                </button>
                <button id="btnClearHist" class="btn btn-outline-secondary">
                  <i class="bi bi-x"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="d-flex align-items-center justify-content-between mb-2">
          <div class="text-muted small">
            <i class="bi bi-info-circle me-1"></i>
            Mostrando <b id="countTravelsHist">0</b> viagem(s)
          </div>
        </div>

        <div id="travelListHist" class="row g-2"></div>
      </div>

      <img style="display:none" onload="openTravelHistory()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" />
    `;
  }
}
