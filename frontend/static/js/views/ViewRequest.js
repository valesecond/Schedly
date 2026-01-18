import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  result = "No Result";

  constructor(params) {
    super(params);
    this.setTitle("Resumo da Requisição");

    this.doc = this.getDefaultDoc();
  }

  getDefaultDoc() {
    return {
      _key: "",
      person: {
        _key: "",
        id: "",
        name: "",
        birthdate: "",
      },
      requestPhase: {
        _key: "",
        medicalRequest: [
          {
            service: "",
            typeService: "",
            isReturn: false,
            isReferral: false,
            requisitionDetail: [],
          },
        ],
        priorityGroup: "",
        observations: "",
      },
      schedulingPhase: {
        _key: "",
      },
    };
  }

  async getMenu() {
    let row = ``;
    row += `
                <ul class="nav nav-tabs justify-content-center">                
                    <li class="nav-item">
                        <a class="nav-link" href="/requestPhase/list">Aguardando Agendamento</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="#">Resumo da Requisição</a>
                    </li>
              
                    `;
    row += `</ul>`;

    return row;
  }

  async init() {
    const _key = this.params._key;
    console.log("init called with _key:", _key);

    if (_key) {
      const fetched = await fetchData(`/schedulingPhase/${_key}`, "GET");
      console.log("fetchData response:", fetched);

      if (!!_key) {
        const fetched = await fetchData(`/schedulingPhase/${_key}`, "GET");
        this.doc = this.deepMerge(this.getDefaultDoc(), fetched);
        this.doc.person.birthdate = this.calculateAge(
          this.doc.person.birthdate
        );
      }
    }

    window.schedulingDoc = this.doc;
  }

  deepMerge(target, source) {
    const output = { ...target };
    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      const targetVal = target[key];

      if (
        sourceVal &&
        typeof sourceVal === "object" &&
        !Array.isArray(sourceVal) &&
        targetVal &&
        typeof targetVal === "object" &&
        !Array.isArray(targetVal)
      ) {
        output[key] = this.deepMerge(targetVal, sourceVal);
      } else {
        output[key] = sourceVal;
      }
    }

    return output;
  }

  calculateAge(birthdate) {
    const birthDate = new Date(birthdate);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) {
      years--;
    }

    if (years > 0) {
      return years + (years === 1 ? " ano" : " anos");
    } else {
      let months = today.getMonth() - birthDate.getMonth();
      if (today.getDate() < birthDate.getDate()) {
        months--;
      }
      if (months < 0) {
        months += 12;
      }
      if (months > 0) {
        return months + (months === 1 ? " mês" : " meses");
      } else {
        const diffTime = Math.abs(today - birthDate);
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return days + (days === 1 ? " dia" : " dias");
      }
    }
  }

  async getHtml() {
    const list = this.doc.requestPhase.medicalRequest;
    const buttonsHtml = list
      .map(
        (req, idx) => `
    <button
      class="btn btn-outline-primary request-btn p-3 rounded-3 text-start"
      style="max-width:400px; min-height:140px;"
      data-idx="${idx}"
      data-type-key="${req.typeService._key}"
      data-type-name="${req.typeService.name}"
    >
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h6 class="mb-1">${req.service}</h6>
          <!-- marquei com data-type para encontrarmos via JS -->
          <small class="type-service" data-type>${req.typeService.name}</small> 
        </div>
        <span class="badge bg-primary">#${idx + 1}</span>
      </div>
      <div class="row gx-2 gy-1 mb-2 small">
        <div class="col-6">
          <i class="bi bi-arrow-clockwise"></i>
          <span>Retorno:</span>
          <strong>${req.isReturn ? "Sim" : "Não"}</strong>
        </div>
        <div class="col-6">
          <i class="bi bi-box-arrow-up-right"></i>
          <span>Encaminhamento:</span>
          <strong>${req.isReferral ? "Sim" : "Não"}</strong>
        </div>
        <div class="col-12 mt-2">
          <i class="bi bi-card-list"></i>
          <span>Detalhes:</span>
          ${req.requisitionDetail.length > 0
            ? req.requisitionDetail
                .map(
                  (d) => `<span class="badge bg-primary py-1 px-2 rounded-0 ms-2">${d.name}</span>`
                )
                .join("")
            : `<span class="text-muted">Nenhum detalhe</span>`
          }
        </div>

      </div>
    </button>
  `
      )
      .join("");

    return `
    <!-- Dados do Paciente -->
    <div class="card shadow-sm rounded-4 border-0" style="box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.15);">
      <div class="card-body">
        <div class="row g-4">
          <div class="col-md-6">
            <div class="form-floating">
              <input type="text" class="form-control" id="person.name" value="${
                this.doc.person.name
              }" readonly placeholder="Nome">
              <label for="person.name">Nome</label>
            </div>
          </div>
          <div class="col-md-3">
            <div class="form-floating">
              <input type="number" class="form-control" id="person.id" value="${
                this.doc.person.id
              }" readonly placeholder="CPF">
              <label for="person.id">CPF</label>
            </div>
          </div>
          <div class="col-md-3">
            <div class="form-floating">
              <input class="form-control" id="person.birthdate" value="${
                this.doc.person.birthdate
              }" readonly placeholder="Data de Nascimento">
              <label for="person.birthdate">Nascimento</label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card de Seleção da Requisição -->
    <div id="card-service" class="card shadow-sm rounded-4 border-0 mt-2" style="max-width: 100%;">
      <div class="card-body p-3" style="min-height: 140px; display: flex; flex-direction: column; justify-content: center;">
        
        <h5 class="fw-semibold mb-3 text-primary d-flex flex-wrap justify-content-center">
          <i class="bi-check2-square me-2"></i>Resumo da Requisição
        </h5>
        
        <div id="request-conteiner" class="d-flex flex-wrap justify-content-center gap-2">
          ${buttonsHtml}
        </div>
        ${getObservationsAndPriorityHtml()}
      </div>
    </div>
    
    <img onload="showViewRequest()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">
  `;
  }
}
