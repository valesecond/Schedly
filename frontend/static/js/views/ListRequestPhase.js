import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  result = "No Result";

  constructor(params) {
    super(params);
    this.setTitle("Aguardando Agendamento");
  }

  async getMenu() {
    let row = `
      <ul class="nav nav-tabs justify-content-center flex-wrap text-center">
        <li class="nav-item">
          <a class="nav-link" href="/dashboard/receptionist">Início</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/reception/new">Novo Atendimento</a>
        </li>
        <li class="nav-item">
          <a class="nav-link active" href="#">Aguardando Agendamento</a>
        </li>
        ${super.getMenu()}
      </ul>
    `;
    return row;
  }

  async init() {
    const user = get_property_from_storage("user");
    const encoded = encodeURIComponent(JSON.stringify(user));
    const data = await fetchData(`/requestPhase/list/${encoded}`, "GET");

    this.list = data.result || [];
    this.currentUser = get_property_from_storage("user");

    // Atualiza a página a cada 3 minutos
    setInterval(() => {
      window.open("/requestPhase/list", "_self");
    }, 180000);
  }

  async getHtml() {
    let row = `
      <div class="card shadow-sm mt-3">
        <div class="card-header bg-light py-3">
          <div class="row align-items-center gx-2 gy-2">
            <div class="col-12 col-md-3">
              <input id="filterCpf" class="form-control" placeholder="CPF do paciente">
            </div>
            <div class="col-12 col-md-6">
              <input id="filterName" class="form-control" placeholder="Nome do paciente">
            </div>
            <div class="col-12 col-md-3">
              <div class="d-flex gap-2">
                <button id="btnFilter" class="btn btn-primary w-100">Buscar</button>
                <button id="btnClear" class="btn btn-outline-secondary">Limpar</button>
              </div>
            </div>
          </div>
        </div>
        <div class="card-body" id="listContainer">
          ${this.renderList(this.list)}
        </div>
      </div>
    `;

    requestAnimationFrame(() => {
      const btn = document.getElementById("btnFilter");
      const btnClear = document.getElementById("btnClear");
      const cpfInput = document.getElementById("filterCpf");
      const nameInput = document.getElementById("filterName");

      if (btn) btn.addEventListener("click", () => this.filterList());
      if (btnClear)
        btnClear.addEventListener("click", () => {
          if (cpfInput) cpfInput.value = "";
          if (nameInput) nameInput.value = "";
          this.resetList();
        });

      [cpfInput, nameInput].forEach((el) => {
        if (!el) return;
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.filterList();
          }
        });
      });
    });

    return row;
  }

  renderList(list) {
    if (!list || list.length === 0) {
      return `<p class="text-center text-muted mt-3">Nenhum registro encontrado.</p>`;
    }

    let html = "";
    list.forEach((element) => {
      const href = `/requestPhase/${element._key}`;
      const cpf = element.person?.id || "Sem CPF";
      const nome = element.person?.name || "Nome não informado";

      html += `
  <div class="card mb-2 border-0 shadow-sm">
    <div class="card-body p-2">

      <div class="d-flex justify-content-between align-items-center w-100">
        <a 
          href="${href}" 
          class="flex-grow-1 text-decoration-none"
          style="padding: 8px 12px; border-radius: 6px;"
          onmouseover="this.classList.add('bg-primary', 'text-white')"
          onmouseout="this.classList.remove('bg-primary', 'text-white')"
        >
        <div class="d-flex justify-content-between">
          <strong class="item-nome">${nome}</strong>
          <strong class="item-cpf">CPF: ${cpf}</strong>
        </div>
      </a>

        <button 
          class="btn btn-sm btn-outline-success d-flex align-items-center ms-2"
          onclick="event.stopPropagation(); event.preventDefault(); window.open('/proof/${element._key}', '_blank')"
          title="Gerar Comprovante"
        >
          <i class="bi bi-file-earmark-text me-1"></i>
          <span>Comprovante</span>
        </button>

      </div>

    </div>
  </div>
`;
    });

    return html;
  }

  resetList() {
    document.getElementById("listContainer").innerHTML = this.renderList(
      this.list
    );
  }

  filterList() {
    const cpfRaw = (document.getElementById("filterCpf")?.value || "").trim();
    const nameRaw = (document.getElementById("filterName")?.value || "").trim();

    if (!cpfRaw && !nameRaw) {
      this.resetList();
      return;
    }

    const searchCpf = cpfRaw.replace(/\D/g, ""); // apenas dígitos
    const searchName = nameRaw.toLowerCase();

    const filtered = this.list.filter((element) => {
      const cpfElement = (element.person?.id || "").replace(/\D/g, "");
      const nameElement = (element.person?.name || "").toLowerCase();

      let cpfMatch = false;
      let nameMatch = false;

      if (searchCpf) {
        cpfMatch = cpfElement.includes(searchCpf);
      }
      if (searchName) {
        nameMatch = nameElement.includes(searchName);
      }

      return (searchCpf && cpfMatch) || (searchName && nameMatch);
    });

    document.getElementById("listContainer").innerHTML =
      this.renderList(filtered);
  }
}
