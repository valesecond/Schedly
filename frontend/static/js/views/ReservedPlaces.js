import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  constructor(params) {
    super(params);
    this.setTitle("Reservar Vagas");
  }

  async getMenu() {
    let row = ``;
    row += `
                <ul class="nav nav-tabs justify-content-center">      
                    <li class="nav-item">
                        <a class="nav-link" href="/dashboard/scheduler">Início</a>
                    </li>          
                    <li class="nav-item">
                        <a class="nav-link" href="/schedulingPhase">Agendamento</a>
                    </li>
                     <li class="nav-item">
                        <a class="nav-link active" href="#">Reserva de Vagas</a>
                    </li>
                    `;
    row += super.getMenu();
    row += `</ul>`;

    return row;
  }

  async getHtml() {
    return `
    <style>

.docs-card {
  margin-top: 25px;
  padding: 20px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  border: 1px solid #e8e8e8;
  animation: fadeIn 0.3s ease;
}

.docs-title {
  font-size: 20px;
  font-weight: 700;
  color: #0d6efd;
  margin-bottom: 18px;
}

.docs-empty {
  color: #777;
  font-size: 15px;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.doc-item {
  background: #f9faff;
  border: 1px solid #d9e4ff;
  border-radius: 10px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: center;
  transition: all 0.25s ease;
}

.doc-item:hover {
  background: #eaf1ff;
  transform: translateY(-2px);
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
}

.doc-icon {
  font-size: 22px;
}

.doc-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  word-break: break-all;
}

.loading {
  padding: 20px;
  text-align: center;
  font-size: 16px;
  color: #0d6efd;
  font-weight: 600;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
      :root { --bs-primary: #0d6efd; --success:#198754; }
      body { margin:0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#ffffff; }
      .container { width:100%; margin:1rem auto; }

      .page-title{ display:flex; align-items:center; justify-content:center; gap:0.75rem; color:var(--bs-primary); font-size:1.6rem; font-weight:600; }
      .page-title .bi{ font-size:1.6rem; }

      #reservedContainer{ height: calc(100vh - 90px); }
      .row-3col{ display:flex; gap:1rem; height:90%; align-items:flex-start; }
      .col{ background:#fff; border-radius:0.5rem; box-shadow:0 6px 18px rgba(13,110,253,0.06); padding:0.5rem; display:flex; flex-direction:column; }
      .col.flex-1{ flex:1; }
      .col.small{ flex:0 0 320px; min-width:280px; }

      .card{ border-radius:0.5rem; overflow:hidden; border:1px solid #f0f0f0; background:#fff; display:flex; flex-direction:column; height:100%; }
      .card-header{ padding:0.75rem 1rem; display:flex; align-items:center; gap:0.5rem; }
      .card-body{ padding:0.75rem 1rem; overflow:auto; flex:1; }

      .paciente-col{ margin-bottom:0.75rem; }
      .paciente-card{ display:flex; align-items:center; gap:0.75rem; padding:0.65rem; border-radius:0.5rem; transition:transform .12s, box-shadow .12s; cursor:pointer; border-left:4px solid var(--success); background:#fff; }
      .paciente-card:hover{ transform:translateY(-3px); box-shadow:0 6px 20px rgba(13,110,253,0.06); }
      .paciente-card .avatar{ width:44px; height:44px; border-radius:50%; display:grid; place-items:center; background:var(--bs-primary); color:#fff; flex-shrink:0; }
      .paciente-card .title{ font-weight:700; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .paciente-card .badges{ display:flex; gap:0.25rem; margin-left:auto; }
      .paciente-card.selected{ background:linear-gradient(90deg, rgba(13,110,253,0.12), rgba(13,110,253,0.06)); color:var(--bs-primary); border-left-color:var(--bs-primary); }

      .btn-dia{ width:100%; padding:0.75rem; border-radius:0.5rem; border:1px dashed rgba(25,135,84,0.3); background:transparent; text-align:left; }
      .btn-dia .date{ font-weight:700; display:block; }
      .btn-dia .meta{ font-size:0.85rem; color:#6c757d; }
      .btn-dia.full{ opacity:.45; pointer-events:none; }

      .agendado-card{ display:flex; align-items:center; gap:0.75rem; padding:0.65rem; border-radius:0.5rem; border:1px solid rgba(13,110,253,0.06); background:#fff; }
      .agendado-card .avatar{ width:36px; height:36px; border-radius:50%; display:grid; place-items:center; background:var(--success); color:#fff; }
      .agendado-card .name{ font-weight:600; }
      .agendado-list{ display:flex; flex-direction:column; gap:0.5rem; }

      .input-search{ display:flex; gap:0.5rem; align-items:center; padding:0.5rem 0; }
      .input-group { display:flex; align-items:center; border:1px solid #dee2e6; border-radius:.375rem; overflow:hidden; }
      .input-group-text { padding:.5rem .75rem; background:#f8f9fa; border-right:1px solid #dee2e6; display:flex; align-items:center; }
      .input-group input{ border:0; padding:.5rem .75rem; outline:none; width:100%; }

      .actions{ display:flex; gap:0.5rem; padding:0.5rem; }
      .btn{ padding:0.6rem 0.9rem; border-radius:0.45rem; border:none; cursor:pointer; }
      .btn-primary{ background:var(--bs-primary); color:#fff; }
      .btn-success{ background:var(--success); color:#fff; }
      .btn-outline{ background:transparent; border:1px solid #ced4da; }

      .no-schedule {
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:0.75rem;
        padding:2rem;
        border-radius:0.5rem;
        color:#6c757d;
        text-align:center;
        background: linear-gradient(180deg, rgba(13,110,253,0.02), rgba(13,110,253,0.01));
        border: 1px dashed rgba(13,110,253,0.08);
      }
      .no-schedule .big-icon{ font-size:2.5rem; color:var(--bs-primary); }
      .no-schedule .lead{ font-weight:700; color:#343a40; }
      .no-schedule p{ margin:0; font-size:0.95rem; }

      .muted { color:#6c757d; font-size:0.95rem; }

      @media (max-width: 992px){ .row-3col{ flex-direction:column; } .col.small{ order:3; } }
    </style>

    <div class="container">
      <h2 class="page-title"><i class="bi bi-calendar-check"></i> Reservar Vagas</h2>
    </div>

    <div id="reservedContainer" class="container">
      <div class="row-3col">

        <!-- Pacientes (coluna esquerda) -->
        <div class="col small card" aria-label="Pacientes à espera">
          <div class="card-header bg-primary text-white d-flex align-items-center">
            <i class="bi bi-people-fill me-2"></i>
            <h5 class="mb-0">Aguardando Reserva</h5>
          </div>
          <div class="card-body" style="display:flex; flex-direction:column;">
            <div class="input-group mb-3" style="margin-bottom:0.75rem;">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input id="searchPaciente" type="text" class="form-control" placeholder="Buscar paciente…" aria-label="Buscar paciente">
            </div>
            <div id="gridPacientes" style="margin-top:8px; flex:1; overflow:auto;">
              <!-- Exemplo estático de cards sem JS -->
              <div class="paciente-col">
              </div>
              <div class="paciente-col">
              </div>
              <div class="paciente-col">
              </div>
            </div>
          </div>
        </div>

        <!-- Central: sem agenda -> fila de reservas -->
        <div class="col flex-1 card" aria-live="polite">
          <div class="card-header bg-success text-white d-flex align-items-center">
            <i class="bi bi-calendar-event-fill me-2"></i>
            <h5 class="mb-0">Modo: Fila de Espera</h5>
          </div>
          <div class="card-body" style="display:flex; flex-direction:column; gap:1rem; align-items:stretch; justify-content:center;">
            <div class="no-schedule" role="status" aria-label="Nenhuma agenda disponível">
              <div class="big-icon"><i class="bi bi-calendar-x"></i></div>
              <div class="lead">Nenhuma agenda disponível</div>
            </div>

            <!-- container dos botões: fora da no-schedule para sempre estar visível -->
            <div id="btnFunction" style="display:flex; gap:0.5rem; margin-top:0.5rem; width:100%; justify-content:center;">
            </div>

            <div class="muted" style="text-align:center;">Quando uma agenda for criada, estes pacientes poderão ser transferidos automaticamente para as vagas abertas.</div>
          </div>

        </div> 
        <div class="col small card" aria-label="Fila de reservas">
          <div class="card-header bg-primary text-white d-flex align-items-center">
            <i class="bi bi-journal-check me-2"></i>
            <h5 class="mb-0">Reservados</h5>
          </div>
          <div class="card-body">
            <div style="margin-bottom:8px; font-size:0.95rem; color:#6c757d;">Para <span id="activeDateLabel">–</span></div>
            <div id="gridAgendados" class="agendado-list">
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="documentosPessoaContainer"></div>

    <img style="display:none" onload="showViewReserved()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">
    `;
  }
}
