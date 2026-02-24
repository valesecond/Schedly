import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  result = "No Result";

  constructor(params) {
    super(params);
    this.setTitle("AgendaSaúde");

    this.doc = {};
  }

  async getMenu() {
    let row = `
      <ul class="nav nav-tabs justify-content-center flex-wrap text-center">
        <li class="nav-item">
          <a class="nav-link" href="/dashboard/transportManager">Início</a>
        </li>
        <li class="nav-item">
          <a class="nav-link active" href="#">Criar Viagens</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/transportPhase/travelPending/list">Viagens Pendentes</a>
        </li>
        <li class="nav-item">
          <a class="nav-link"  href="/transportPhase/travelMade/list">Viagens Concluídas</a>
        </li>
        <li class="nav-item">
          <a class="nav-link"  href="/transportPhase/travelHistory/list">Histórico de Viagens</a>
        </li>
        ${super.getMenu()}
      </ul>
    `;
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
        width: 100%;
      }

      /* Título com ícone */
      .page-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        color: var(--bs-primary);
        font-size: 2rem;
        font-weight: 600;
      }
      .page-title .bi {
        font-size: 2.5rem;
        transition: transform 0.3s ease;
      }
      .page-title:hover .bi {
        transform: rotate(20deg) scale(1.1);
      } 

      .tree > details {
        position: relative;
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
        border-radius: 0.5rem;

        list-style: none;
        padding: 1.25rem 1.5rem;
        cursor: pointer;

        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 700;
        font-size: 1.125rem;
        background: #ffffff;
      }

      .tree summary::-webkit-details-marker { display: none; }
      .tree summary .bi {
        transition: transform 0.3s, color 0.3s;
        font-size: 1.5rem;
        color: #6c757d;
      }
      .tree details[open] > summary .bi {
        transform: rotate(180deg);
        color: var(--bs-primary);
      }

      .tree details > ul {
        overflow: hidden;
        transform-origin: top;
      }

      .tree details > ul li {
        opacity: 0;
        transition: opacity 0.2s ease 0.1s;
      }
   
      .tree details[open] > ul li {
        opacity: 1;
      }

      .tree .nested {
        list-style: none;
        margin: 0;
        padding-left: 1.5rem;
        padding-bottom: 1rem;
      }
      .tree .nested > details {
        background: #ffffff;
        border-left: 4px solid rgb(7, 124, 42);
        border-radius: 0.375rem;
        margin: 0.5rem 0;
        box-shadow: 0 1px 6px rgba(0,0,0,0.03);
        transition: box-shadow 0.3s, transform 0.3s;
      }
      .tree .nested > details:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(0,0,0,0.05);
      }
      .tree .nested details > summary {
        padding: 0.85rem 1.5rem;
        font-size: 1rem;
        font-weight: 600;
        background: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .tree .nested .nested {
        list-style: none;
        margin: 0;
        padding-left: 3rem;   /* dobra o recuo do nível 2 */
      }

      /* Se você tiver <details> aninhados no nível 3, estilize também: */
      .tree .nested .nested > details {
        background: #ffffff;
        border-left: 4px solid rgb(247, 255, 22);  
        border-radius: 0.3125rem;
        margin: 0.4rem 0;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02);
        transition: box-shadow 0.3s, transform 0.3s;
      }
      .tree .nested .nested > details:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      }

      .tree .nested .nested li[data-unit] {
        position: relative;
        transition: background 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s;
        padding: 0.75rem 1.5rem;
        background: #ffffff;
        margin: 0.3rem 0;
        border-radius: 0.3125rem;
        cursor: pointer;
        font-size: 0.98rem;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-left: 4px solid rgb(130, 13, 165); /* borda mais suave ainda */
      }
      .tree .nested .nested li[data-unit]:hover {
        background: var(--bs-primary); /* azul do Bootstrap */
        color: #ffffff;               /* texto branco */
        transform: translateX(2px);
        box-shadow: 0 2px 6px rgba(13, 110, 253, 0.25);
      }
      .tree .nested .nested li.active {
        background: var(--bs-primary);
        color: #fff;
        box-shadow: inset 3px 0 0 #fff;
        transform: none;
      }
      
      /* manter full-height */
      html, body, #schedulingContainer, #schedulingContainer .card,
      #schedulingContainer .card-body { height: 100%; }

      /* Botões de dia */
      .btn-dia {
        width: 100%;
        text-align: center;
        padding: 1rem;
        border-radius: .5rem;
        transition: transform .1s;
      }
      .btn-dia:hover:not(.full):not(.active) { transform: scale(1.03); }
      .btn-dia.active { background-color: #198754; color: #fff; border-color: #198754; }
      .btn-dia.full { opacity: .4; pointer-events: none; }

      /* Busca */
      #searchPaciente { border-bottom: 1px solid #ccc; border-radius: 0; }

      /* Cards de paciente e agendado */
      .paciente-card, .agendado-card {
        transition: box-shadow .2s ease;
        height: 100%;
        cursor: pointer;
      }
      .paciente-card:hover, .agendado-card:hover {
        box-shadow: 0 .5rem 1rem rgba(13,110,253,.15);
      }
      .paciente-card .avatar, .agendado-card .avatar {
        width: 3rem; height: 3rem;
        display: grid; place-items: center;
      }
      .paciente-card .form-check-input {
        transform: scale(1.4);
      }
      /* Truncamento de nome */
      .text-truncate {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
        
      html, body {
        height: 100%;
        margin: 0;
      }
      #schedulingContainer {
        height: 100vh; /* ocupa toda a altura da janela */
      }
      #schedulingContainer .h-100 {
        height: 100%;
      }

    /* Garante que o avatar seja bem grande e centralizado */
    .paciente-card .avatar {
      width: 2.5rem;
      height: 2.5rem;
      margin-right: 0.75rem;
    }
    .paciente-card .card-body {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
    }
    .paciente-card .card-title {
      margin: 0;
      font-size: 1rem;
      flex-grow: 1;
    }

    /* Estado selecionado do card: fundo primary, texto branco e bold */
    .paciente-card.selected {
      border-color: var(--bs-primary) !important;
      background-color: var(--bs-primary);
      color: #fff;
      font-weight: 700;
      box-shadow: 0 .5rem 1rem rgba(13,110,253,.5);
    }

    /* Garanta que todo texto dentro do card fique branco */
    .paciente-card.selected .card-title {
      color: #fff;
    }

/* Selecionado sempre azul, inclusive no hover */
.card.paciente-card.selected,
.card.paciente-card.selected:hover {
  background-color: var(--bs-primary) !important;
  border-color: var(--bs-primary) !important;
  box-shadow: 0 .75rem 1.5rem rgba(13,110,253,.6) !important;
}

/* Título em branco */
.card.paciente-card.selected .card-title {
  color: #fff !important;
}

/* Avatar invertido */
.card.paciente-card.selected .avatar {
  background-color: #fff !important;
}
.card.paciente-card.selected .avatar i {
  color: var(--bs-primary) !important;
} 

/* A propósito: para mostrar o hover mesmo se tiver um <button> interno,
   garantimos que o .card capture o cursor */
.card.paciente-card {
  cursor: pointer;
}

/* Se quiser um ligeiro leve aumento ao hover (mesmo sem estar selecionado) */
.card.paciente-card:hover {
  transform: translateY(-2px);
  box-shadow: 0.2rem 0.2rem rgba(13,110,253,.2);
}

    /* Título truncado se muito longo */
    .paciente-card .card-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Cards de Agendados - mesmo estilo dos pacientes */
    .agendado-card .avatar {
      width: 2rem;
      height: 2rem;
      margin-right: 0.75rem;
    }
    .agendado-card .card-body {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
    }
    .agendado-card .card-title {
      margin: 0;
      font-size: 1rem;
      flex-grow: 1;
    }

.agendado-card {
  position: relative;
  display: flex;
  justify-content: space-between;
}
.agendado-card .btn-return,
.agendado-card .btn-delete {
  border-width: 1px;
  padding: .25rem .5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.agendado-card .btn-return i,
.agendado-card .btn-delete i {
  font-size: 1rem;
}

details.type-block > summary {
  display: inline-flex;
  gap: 0.1rem;        /* ou ajuste: 0.25rem ou 0.2rem */
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  user-select: none;
  line-height: 1;
}

summary.d-flex {
  justify-content: flex-start !important;
}


details.type-block > summary span {
  margin: 0;
  padding: 0;
}


/* Estiliza o item de especialista como clicável */
.specialist-item {
  padding: 0.25rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 4px;
}

/* Efeito ao passar o mouse sobre o especialista */
.specialist-item:hover {
  background-color: #f0f0f0;
}


.specialist-item i {
  color: #0d6efd;
}

    </style>
    
    <div class="container">
      <h2 class="page-title">
        <i class="bi bi-calendar3"></i>
        Agendas
      </h2>

<!-- Filtro (simples, só Bootstrap + inline) -->
<div id="unitsFilterCard" class="card border-0 shadow-sm rounded-4 mb-3">
  <div class="card-body p-3">
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
      <div class="d-flex align-items-center gap-2">
        <span class="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary text-white"
              style="width:36px;height:36px;">
          <i class="bi bi-funnel-fill"></i>
        </span>
        <div class="lh-sm">
          <div class="fw-bold text-primary">Filtrar Agendas</div>
          <small class="text-muted">Busque por nome ou cidade</small>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2">
        <span class="badge rounded-pill text-bg-primary px-3 py-2">
          <i class="bi bi-list-ul me-1"></i>
          <span id="unitsCount">0</span>
        </span>
        <button id="unitsClear" type="button" class="btn btn-outline-secondary btn-sm rounded-pill px-3">
          <i class="bi bi-x-circle me-1"></i> Limpar
        </button>
      </div>
    </div>

    <div class="row g-2">
      <!-- Busca -->
      <div class="col-md-7">
        <div class="input-group">
          <span class="input-group-text bg-white">
            <i class="bi bi-search text-primary"></i>
          </span>
          <input
            id="unitsSearch"
            type="text"
            class="form-control"
            placeholder="Digite o nome da unidade..."
            autocomplete="off"
          />
        </div>
      </div>

      <!-- Cidade -->
      <div class="col-md-5">
        <div class="input-group">
          <span class="input-group-text bg-white">
            <i class="bi bi-geo-alt-fill text-primary"></i>
          </span>
          <select id="unitsCityFilter" class="form-select">
            <option value="">Todas as cidades</option>
          </select>
        </div>
      </div>
    </div>
   </div>
</div>


      <div class="tree" id="unitsContainer"></div>
    </div>

<div id="schedulingContainer" class="container-fluid px-2 px-lg-3" style="display:none;">
  <div class="row g-3">
    <!-- Coluna de Pacientes -->
    <div class="col-12 col-lg-4">
      <div class="card shadow-sm h-100">
        <div class="card-header bg-primary text-white d-flex align-items-center">
          <i class="bi bi-people-fill me-2"></i>
          <h5 class="mb-0">Aguardando Transporte</h5>
        </div>
        <div class="card-body d-flex flex-column">
          <div class="input-group mb-3">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input id="searchPaciente" type="text" class="form-control" placeholder="Buscar paciente…">
          </div>
          
          <div id="gridPacientes"
               class="row g-3 flex-grow-1"
               style="max-height:450px; overflow-y:auto;">
            <!-- Cards de pacientes serão injetados aqui -->
          </div>
        </div>
      </div>
    </div>

    
    <div id="colAgendados" class="col-12 col-lg-8" style="display: none;">
      <div class="card shadow-sm h-100">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">
            <i class="bi bi-journal-check me-2"></i>Viagem
          </h5>
        </div>
        <div class="card-body overflow-auto d-flex flex-column">
          <div id="gridAgendados" class="row g-3 flex-grow-1">
            <!-- Cards de agendados serão injetados aqui -->
          </div>
        </div>
      </div>
    </div>
    <!-- ✅ LISTA DE VIAGENS (ABAIXO DOS DOIS CARDS) -->
<div class="row mt-3">
  <div class="col-12">
    <div class="card shadow-sm">
      <div class="card-header bg-light d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-list-check text-primary"></i>
          <strong>Viagens criadas</strong>
        </div>
        <small class="text-muted" id="tripsCount">0</small>
      </div>

      <div class="card-body">
        <div id="tripsList" class="row g-2">
          <!-- cards de viagens entram aqui -->
        </div>
      </div>
    </div>
  </div>
</div>

    </div>
  </div><!-- fecha .row.gy-4 -->
</div><!-- fecha #schedulingContainer -->


 
      </div>
    </div>
    <img style="display:none" onload="openSchedulingScreen()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">
  `;
  }
}
