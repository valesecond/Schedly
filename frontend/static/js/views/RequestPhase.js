import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  result = "No Result";

  constructor(params) {
    super(params);
    this.setTitle("Requisição");

    this.doc = this.getDefaultDoc();
    //this.init();
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
        medicalRequest: [],
        priorityGroup: "",
        conduct: "elective",
        observations: "",
      },
    };
  }

  async getMenu() {
    let row = ``;
    row += `
                <ul class="nav nav-tabs justify-content-center">                
                <li class="nav-item">
                        <a class="nav-link" href="/reception/${this.doc.person._key}">Atendimento</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="#">Requisição</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/requestPhase/list">Lista de Atendidos</a>
                    </li>
                    `;
    row += `</ul>`;

    return row;
  }

  async init() {
    const _key = this.params._key;
    console.log("init called with _key:", _key);

    if (_key) {
      const fetched = await fetchData(`/requestPhase/${_key}`, "GET");
      console.log("fetchData response:", fetched);

      if (!!_key) {
        const fetched = await fetchData(`/requestPhase/${_key}`, "GET");
        this.doc = this.deepMerge(this.getDefaultDoc(), fetched);
        this.doc.person.birthdate = this.calculateAge(
          this.doc.person.birthdate
        );
      }
    }

    window.reqDoc = this.doc;
  }

  deepMerge(target, source) {
    const output = { ...target }; // começa com todos os campos do default

    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      const targetVal = target[key];

      // se for objeto em ambos os lados, merge recursivamente
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
        // senão, só sobrescreve
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
    return `

    <input type="hidden" class="aof-input" id="_key" value="${this.doc._key}">
    <input type="hidden" class="aof-input" id="person._key" value="${
      this.doc.person._key
    }">
    <input type="hidden" class="aof-input" id="person.address.property._key" 
    value="${this.doc.person.address.property._key}">

    <style>
      .tag-input-container {
        background-color: white;
        cursor: text;
      }

      .tag-input-container .pill {
        display: inline-flex;
        align-items: center;
        background-color: #0d6efd; /* azul Bootstrap */
        color: white;
        padding: 0.3rem 0.5rem;
        margin-right: 0.25rem;
        margin-bottom: 0.25rem;
        font-size: 0.875rem;
      }

      .tag-input-container .pill .remove-pill {
        margin-left: 0.25rem;
        cursor: pointer;
      }

      .detail-suggestions-box {
        background: white;
        border: 1px solid #ced4da;
        border-radius: 0.25rem;
        max-height: 200px;
        overflow-y: auto;
        z-index: 10;
        padding: 4px; 
      }
    </style>

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
              <label for="person.birthdate">Idade</label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card de Seleção do Serviço -->
    <div id="card-service" class="card shadow-sm rounded-4 border-0 mt-2" style="max-width: 100%;">
      <div class="card-body p-3" style="min-height: 140px; display: flex; flex-direction: column; justify-content: center;">
        <h5 class="fw-semibold mb-3 text-primary d-flex flex-wrap justify-content-center">
          <i class="bi bi-list-check me-2"></i>Selecione o Serviço
        </h5>
        <div id="servico-container" class="d-flex flex-wrap justify-content-center gap-2"></div>
      </div>
    </div>

    <!-- Card de Seleção do Tipo (inicialmente oculto) -->
    <div id="options-card" class="card shadow-sm rounded-4 border-0 mt-2" style="max-width: 100%; display: none;">
      <div class="card-body p-0" style="min-height: 140px; display: flex; flex-direction: column; justify-content: center;">
        <h5 class="fw-semibold mb-3 text-primary d-flex flex-wrap justify-content-center">
          <i class="bi bi-list-ul me-2"></i>Selecione o Tipo
        </h5>
        <div id="options-container" class="d-flex flex-wrap justify-content-center gap-2"></div>
      </div>
    </div>

    <!-- Card de Resumo -->
    <div id="card-summary"
        class="card shadow-sm rounded-4 border-0 mt-2"
        style="max-width: 100%; display: none;">
      <div class="card-body p-3">
        <h5 class="fw-semibold mb-3 text-primary text-center p-2">
          <i class="bi-card-checklist me-2"></i>Serviços Selecionados
        </h5>
          <div
            id="summary-list"
            class="row justify-content-center row-cols-1 g-4"
            style="max-height:280px ;overflow-y:auto;" 
          </div>
      </div>
    </div>

    <!-- Card de Prioridades -->
    <div id="card-priorities"
      class="card shadow-sm rounded-4 rounded-bottom-0 border-0 mt-2"
      style="max-width: 100%;">
      <div class="card-body p-3">

        <div class="row">
          <!-- Coluna: Tipo de Atendimento -->
          <div class="col-md-6">
            <div class="card flex-fill">
              <div class="card-head text-center py-2" style="min-height: 130.5px;">
                <p class="fw-semibold text-primary mb-3">
                  <i class="bi bi-activity me-2 text-primary"></i>Tipo de Atendimento
                </p>
                <div class="btn-group" role="group" aria-label="Grupo de conduta">
                  <input onclick="selectConduct(this)" type="radio" class="btn-check aof-input" name="conduct"
                    id="conduct.elective" value="elective"
                    ${
                      this.doc.requestPhase?.conduct === "elective"
                        ? "checked"
                        : ""
                    }>
                  <label class="btn btn-outline-success" for="conduct.elective">Eletiva</label>

                  <input onclick="selectConduct(this)" type="radio" class="btn-check aof-input" name="conduct"
                    id="conduct.urgency" value="urgency"
                    ${
                      this.doc.requestPhase?.conduct === "urgency"
                        ? "checked"
                        : ""
                    }>
                  <label class="btn btn-outline-warning" for="conduct.urgency">Urgência</label>

                  <input onclick="selectConduct(this)" type="radio" class="btn-check aof-input" name="conduct"
                    id="conduct.emergency" value="emergency"
                    ${
                      this.doc.requestPhase?.conduct === "emergency"
                        ? "checked"
                        : ""
                    }>
                  <label class="btn btn-outline-danger" for="conduct.emergency">Emergência</label>
                </div>
              </div>
            </div>
          </div>

<!-- Coluna: Público Prioritário -->
<div class="col-md-6">
  <div class="card flex-fill">
    <div class="card-head text-center py-3" style="min-height: 115px;">
      <p class="fw-semibold text-primary mb-3">
        <i class="bi bi-person-arms-up me-2 text-primary"></i>Público Prioritário
      </p>

      <div class="container">
        <div class="row g-2">

          <!-- Linha 1 -->
          <div class="col-4">
            <div class="form-check d-flex align-items-center gap-1 justify-content-center">
              <input class="form-check-input aof-input-aggregate" type="checkbox"
                name="priorityGroup" id="priorityGroup.pregnant" value="pregnant"
                ${
                  this.doc.requestPhase.priorityGroup?.includes("pregnant")
                    ? "checked"
                    : ""
                }>
              <label class="form-check-label" for="priorityGroup.pregnant">Gestante</label>
            </div>
          </div>

          <div class="col-4">
            <div class="form-check d-flex align-items-center gap-1 justify-content-center">
              <input class="form-check-input aof-input-aggregate" type="checkbox"
                name="priorityGroup" id="priorityGroup.elderly" value="elderly"
                ${
                  this.doc.requestPhase.priorityGroup?.includes("elderly")
                    ? "checked"
                    : ""
                }>
              <label class="form-check-label" for="priorityGroup.elderly">Idoso (60+)</label>
            </div>
          </div>

          <div class="col-4">
            <div class="form-check d-flex align-items-center gap-1 justify-content-center">
              <input class="form-check-input aof-input-aggregate" type="checkbox"
                name="priorityGroup" id="priorityGroup.superelderly" value="superelderly"
                ${
                  this.doc.requestPhase.priorityGroup?.includes("superelderly")
                    ? "checked"
                    : ""
                }>
              <label class="form-check-label" for="priorityGroup.superelderly">Super Idoso</label>
            </div>
          </div>

          <!-- Linha 2 -->
          <div class="col-4">
            <div class="form-check d-flex align-items-center gap-1 justify-content-center">
              <input class="form-check-input aof-input-aggregate" type="checkbox"
                name="priorityGroup" id="priorityGroup.disabilities" value="disabilities"
                ${
                  this.doc.requestPhase.priorityGroup?.includes("disabilities")
                    ? "checked"
                    : ""
                }>
              <label class="form-check-label" for="priorityGroup.disabilities">PCD</label>
            </div>
          </div>

          <div class="col-4">
            <div class="form-check d-flex align-items-center gap-1 justify-content-center">
              <input class="form-check-input aof-input-aggregate" type="checkbox"
                name="priorityGroup" id="priorityGroup.child" value="child"
                ${
                  this.doc.requestPhase.priorityGroup?.includes("child")
                    ? "checked"
                    : ""
                }>
              <label class="form-check-label" for="priorityGroup.child">Criança</label>
            </div>
          </div>

          <div class="col-4">
            <div class="form-check d-flex align-items-center gap-1 justify-content-center">
              <input class="form-check-input aof-input-aggregate" type="checkbox"
                name="priorityGroup" id="priorityGroup.oncologic" value="oncologic"
                ${
                  this.doc.requestPhase.priorityGroup?.includes("oncologic")
                    ? "checked"
                    : ""
                }>
              <label class="form-check-label" for="priorityGroup.oncologic">Oncológico</label>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</div>
          </div>
        </div>

      </div>
    </div>

    <!-- Card de Observações -->
    <div id="Observation"
        class="card shadow-sm rounded-4 rounded-top-0 border-0"
        style="max-width: 100%;">
      <div class="card-body p-3">
        <div class="form-floating">
          <input
            autocomplete="off"
            class="form-control bg-light aof-input"
            name="observations"
            id="observations"
            value="${this.doc.requestPhase.observations}"
            placeholder="Observações"
            style="width: 100%; height: 100px; resize: vertical;"
          >
          <label for="observations">Observações</label>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary form-control" onclick="saveRequestPhase(this)">
          Salvar
        </button>
      </div>
    </div>

     <img
      style="display:none"
      onload="showViewRequestPhase()"
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">
  `.trim();
  }
}
