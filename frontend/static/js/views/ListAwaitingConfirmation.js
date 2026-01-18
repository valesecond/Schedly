import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  result = "No Result";

  constructor(params) {
    super(params);
    this.setTitle("Aguardando Atendimento");

  }

  async getMenu() {
    let row = `
      <ul class="nav nav-tabs justify-content-center">
      <li class="nav-item">
          <a class="nav-link" href="/dashboard/attendant">Início</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/awaiting/list">Aguardando Chegada</a>
        </li>
        <li class="nav-item">
          <a class="nav-link active" href="#">Aguardando Atendimento</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/served/list">Atendidos</a>
        </li>
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

    const today = new Date().toISOString().split('T')[0];

    return `
    
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        background: #ffffff;
      }
      .container {
        width: 100%;
        margin: 2rem auto;
      }
      /* Título com ícone */
      .page-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        color: var(--bs-primary);
        font-size: 1.6rem;
        font-weight: 600;
      }
      .page-title .bi {
        font-size: 2rem;
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

.specialist-item:hover {
  background-color: #f0f0f0;
}


.specialist-item i {
  color: #0d6efd;
}

  .main-card {
    background-color: #fff;
    border-radius: 0.75rem;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  /* Título */
  .main-card .card-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--bs-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  /* Card interno de filtro */
  .filter-card {
    background-color: #f8f9fa;
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
  }

  .filter-card .input-group-text {
    background: transparent;
    border: none;
    color: #495057;
    font-size: 1.1rem;
  }

  .filter-card .form-control {
    border-radius: 0.375rem;
    border: 1px solid #ced4da;
    background-color: #fff;
    color: #000;
  }

  .filter-card .form-control::placeholder {
    color: #6c757d;
  }

  .filter-card .btn-filter {
    border-radius: 0.375rem;
    padding: 0.5rem 1.25rem;
    width: 100%;
  }

  @media (min-width: 768px) {
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      align-items: end;
    }

    .filter-card .btn-filter {
      width: auto;
    }
  }    
    </style>

    <div class="container" id="container">
      <div class="main-card">
        <!-- Título -->
        <div class="page-title mb-3">
          <i class="bi bi-calendar3"></i>
          Aguardando Atendimento
        </div>

        <!-- Filtros -->
        <div class="filter-card">
          <div class="filter-grid">

          <div class="input-group">
              <span class="input-group-text"><i class="bi bi-hospital"></i></span>
              <select id="specialty" class="form-select">
                <option value="">Especialidades</option>
                <option value="cardio">Cardiologia</option>
                <option value="derma">Dermatologia</option>
                <option value="ortho">Ortopedia</option>
                <!-- … outras opções … -->
              </select>
            </div>
            
            <!-- Nome -->
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-person-circle"></i></span>
              <input type="text" id="name" class="form-control" placeholder="Nome">
            </div>

            <!-- Data Base -->
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-calendar-date"></i></span>
              <input type="date" id="startDate" class="form-control" value="${today}">
            </div>

            <!-- CPF -->
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-person-badge"></i></span>
              <input type="text" id="id" class="form-control" placeholder="CPF">
            </div>

            <!-- Cartão SUS -->
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-card-list"></i></span>
              <input type="text" id="susCard" class="form-control" placeholder="Cartão SUS">
            </div>

            <!-- Botão Filtrar -->
            <div class="text-end">
              <button
                class="btn btn-primary btn-filter"
                onclick="confirmationFilterAction()"
              >
                <i class="bi bi-search me-1"></i> Filtrar
              </button>
            </div>
          </div>
        </div>

        <!-- Árvore de pessoas -->
        <div class="tree" id="personContainerProvided"></div>
      </div>
    </div>

    <img style="display:none" onload="showViewConfirmation()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">
  `;
  }
}
 