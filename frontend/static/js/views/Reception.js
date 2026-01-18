import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  result = "No Result";

  constructor(params) {
    super(params);
    this.setTitle("Recepção");

    this.doc = {
      _key: "",
      request: {
        _key: "",
      },
      person: {
        _key: "",
        files: [
          {
            doc_identidade: null,
            doc_residencia: null,
            doc_sus: null,
            doc_laudos: null,
          },
        ],
        id: "",
        name: "",
        gender: "",
        susCard: "",
        birthdate: "",
        motherName: "",
        acs: {
          _key: "",
          name: "",
        },
        esf: {
          _key: "",
          name: "",
        },
        disability: {
          name: "",
        },
        contact: {
          phone: "",
          email: "",
        },
        job: {
          name: "",
        },
        address: {
          property: {
            _key: "",
            address: {
              way: {
                _key: "",
                name: "",
              },
              neighborhood: {
                name: "",
                _key: "",
              },
              city: {
                name: "",
                _key: "",
                state: "",
              },
              number: "",
            },
          },
        },
      },
    };
  }

  async getMenu() {
    let row = ``;
    row += `
                <ul class="nav nav-tabs justify-content-center">                
                    <li class="nav-item">
                        <a class="nav-link" href="/dashboard/receptionist">Início</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="#">Em Atendimento</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/reception/new">Novo Atendimento</a>
                    </li>
                    `;
    row += `</ul>`;

    return row;
  }

  async toggleDoc(id) {
    const box = document.getElementById(id);
    const btn = document.getElementById(id + "_btn");
    if (!box || !btn) return;
    if (box.style.display === "none" || box.style.display === "") {
      box.style.display = "block";
      btn.innerText = "Minimizar";
    } else {
      box.style.display = "none";
      btn.innerText = "Visualizar";
    }
  }

  async init() {
    console.log("Reception");

    if (get_property_from_storage("user") == "") {
      window.open("/user/login", "_self");
    }

    const _key = this.params._key;
    console.log("_key:", _key);

    if (!!_key) {
      this.doc = await fetchData(`/reception/${_key}`, "GET");
    }

    console.log(this.doc);
    window.receptionDoc = this.doc;
  }

  async getHtml() {
    return `

    <style>
    .doc-body {
  display: none;
}

                    .form-floating {
                    margin-bottom: 1rem;
                }
                .custom-radio-group {
                    display: flex;
                    align-items: center;
                    padding-left: 10px; 
                }
                .form-check-inline {
                    margin-right: 1rem;
                }
                .gender-label {
                    margin-right: 1rem;
                    padding-left: 10px; 
                }
                .form-label {
                    padding-left: 10px;
                    padding-right: 10px;
                }
                .form-input {
                    padding-left: 10px;
                    padding-right: 10px;
                }
                .gender-card {
                    padding: 0;
                    height: 58px; 
                    display: flex;
                    align-items: center;
                }
                .gender-card .card-body {
                    display: flex;
                    align-items: center;
                    width: 100%;
                }
                .gender-label-left {
                    margin-right: 1rem;
                    padding-left: 0; 
                }

.doc-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0px 2px 8px rgba(0,0,0,0.06);
}

.doc-header {
  padding: 12px 16px;
  background: #f7f7f7;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doc-title { font-size: 15px; }

.toggle-btn {
  background: #dcdcdc;
  border: none;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  display: none;
}

.doc-body {
  display: none;
  padding: 16px;
  background: #fff;
}

.doc-status {
  color: #28a745;
  font-weight: 600;
  font-size: 13px;
  margin-right: 10px;
  display: none;
}

.preview-wrapper {
  margin-top: 10px;
  display: none;
}

.preview-box {
  height: 100%;  
  border: 1px solid #ddd;
  padding: 8px;
  border-radius: 6px;
}

.preview-image {
  width: 100%;
  height: auto;
  border-radius: 6px;
  margin-top: 10px;
}

.preview-pdf {
  width: 100%;
  height: 500px; /* altura fixa (visível) */
  border-radius: 6px;
  margin-top: 10px;
  border: 1px solid #d9d9d9;
}

      .scroll-container { max-height:78vh; overflow-y:auto; padding-right:10px; padding-left:10px; }
      .scroll-container::-webkit-scrollbar { width:6px; }
      .scroll-container::-webkit-scrollbar-track { background:#f1f1f1; border-radius:10px; }
      .scroll-container::-webkit-scrollbar-thumb { background:#c9c9c9; border-radius:10px; }

      .doc-section { margin:15px; }

      /* responsiveness tweaks */
      @media (max-width:576px) {
        .doc-header { padding:10px; }
        .doc-body { padding:10px; }
        .pdf-frame { height:320px; }
      }

      .doc-item input[type="file"] {
    position: relative;
    z-index: 10;
}

    </style>

    <!-- ================= HIDDEN IDS PRESERVADOS ================= -->
    <input type="hidden" class="aof-input" id="_key" value="${this.doc._key}">
    <input type="hidden" class="aof-input" id="person._key" value="${
      this.doc.person._key
    }">
    <input type="hidden" class="aof-input" id="person.address.property.address.way._key" value="${
      this.doc.person.address.property.address.way._key
    }">
    <input type="hidden" class="aof-input" id="person.address.property.address.neighborhood._key" value="${
      this.doc.person.address.property.address.neighborhood._key
    }">
    <input type="hidden" class="aof-input" id="person.address.property.address.city._key" value="${
      this.doc.person.address.property.address.city._key
    }">
    <input type="hidden" class="aof-input" id="person.acs._key" value="${
      this.doc.person.acs._key
    }">
    <input type="hidden" class="aof-input" id="person.esf._key" value="${
      this.doc.person.esf._key
    }">
    <input type="hidden" class="aof-input" id="person.address.property._key" value="${
      this.doc.person.address.property._key
    }">

    <input type="hidden" id="view" value="reception">

    <div class="card">
      <div class="card-body p-0">
        <div class="scroll-container">

          <!-- ==================== FORMULÁRIO ORIGINAL (mantido) ==================== -->
          <div class="p-3">
            <div class="row">
              <div class="col-md-2">
                <div class="form-floating">
                  <input class="form-control aof-input" oninput="viewPersonValidator(this)" value="${
                    this.doc.person.id
                  }" type="number" autocomplete="off" id="person.id" placeholder="CPF">
                  <label class="form-label" for="person.id">CPF:</label>
                  <div id="person.id-validation" class=""></div>
                </div>
              </div>

              <div class="col-md-3">
                <div class="form-floating">
                  <input class="form-control aof-input" type="text" value="${
                    this.doc.person.susCard
                  }" onkeyup="viewPersonValidator(this)" autocomplete="off" id="person.susCard" placeholder="Cartão do SUS" required>
                  <label class="form-label" for="person.susCard">Cartão do SUS:</label>
                  <div id="person.susCard-validation" class=""></div>
                </div>
              </div>

              <div class="col-md-2">
                <div class="form-floating">
                  <select onchange="viewPersonValidator(this)" class="form-select aof-input needs-validation" id="person.gender" required>
                    <option value=""></option>
                    <option ${
                      this.doc.person.gender == "Masculino" ? "selected" : ""
                    } value="Masculino">M</option>
                    <option ${
                      this.doc.person.gender == "Feminino" ? "selected" : ""
                    } value="Feminino">F</option>
                  </select>
                  <label for="person.gender">Sexo:</label>
                  <div id="person.gender-validation" class=""></div>
                </div>
              </div>

              <div class="col">
                <div class="form-floating">
                  <input onkeyup="viewPersonValidator(this)" class="form-control aof-input" type="search" value="${
                    this.doc.person.disability.name
                  }" autocomplete="on" id="person.disability.name" placeholder="Deficiência" required>
                  <label class="form-label" for="person.job.name">Deficiência:</label>
                  <div id="person.disability.name-validation" class=""></div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-9">
                <div class="form-floating">
                  <input oninput="viewPersonValidator(this)" class="form-control aof-input form-input needs-validation" type="text" value="${
                    this.doc.person.name
                  }" autocomplete="off" id="person.name" placeholder="Nome" required>
                  <label class="form-label" for="person.name">Nome:</label>
                  <div id="person.name-validation" class=""></div>
                  <div id="listPersonNamePill"></div>
                </div>
              </div>

              <div class="col-md-3">
                <div class="form-floating">
                  <input oninput="viewPersonValidator(this)" class="form-control aof-input needs-validation" type="date" value="${
                    this.doc.person.birthdate
                  }" autocomplete="off" id="person.birthdate" placeholder="Data de Nascimento" required>
                  <label class="form-label" for="person.birthdate">Data de Nascimento:</label>
                  <div id="person.birthdate-validation" class=""></div>
                </div>
              </div>
            </div>

            <div class="form-floating">
              <input class="form-control aof-input form-input" type="text" value="${
                this.doc.person.motherName
              }" autocomplete="off" id="person.motherName" placeholder="Nome da Mãe">
              <label class="form-label" for="person.motherName">Nome da Mãe:</label>
              <div id="person.motherName-validation" class=""></div>
              <div id="listMotherNamePill"></div>
            </div>

            <div class="row mt-3">
              <div class="col-md-6">
                <div class="form-floating">
                  <input class="form-control aof-input form-input needs-validation" type="search" value="${
                    this.doc.person.esf.name
                  }" onkeyup="viewPersonValidator(this)" autocomplete="off" id="person.esf.name" placeholder="ESF">
                  <label class="form-label" for="person.esf.name">ESF:</label>
                  <div id="person.esf.name-validation" class=""></div>
                  <div id="listEsfPill"></div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="form-floating">
                  <input class="form-control aof-input form-input needs-validation" type="search" value="${
                    this.doc.person.acs.name
                  }" onkeyup="viewPersonValidator(this)" autocomplete="off" id="person.acs.name" placeholder="ACS">
                  <label class="form-label" for="person.acs.name">ACS:</label>
                  <div id="person.acs.name-validation" class=""></div>
                  <div id="listAcsPill"></div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col">
                <div class="form-floating">
                  <input onkeyup="viewPersonValidator(this)" class="form-control aof-input" type="search" value="${
                    this.doc.person.job.name
                  }" autocomplete="off" id="person.job.name" placeholder="Ocupação" required>
                  <label class="form-label" for="person.job.name">Ocupação:</label>
                  <div id="person.job.name-validation" class=""></div>
                </div>
              </div>

              <div class="col">
                <div class="form-floating">
                  <input onkeyup="viewPersonValidator(this)" class="form-control aof-input needs-validation" type="number" value="${
                    this.doc.person.contact.phone
                  }" autocomplete="off" id="person.contact.phone" placeholder="Telefone">
                  <label class="form-label" for="person.contact.phone">Telefone:</label>
                  <div id="person.contact.phone-validation" class=""></div>
                </div>
              </div>

              <div class="col">
                <div class="form-floating">
                  <input onkeyup="viewPersonValidator(this)" class="form-control aof-input" type="email" value="${
                    this.doc.person.contact.email
                  }" autocomplete="off" id="person.contact.email" placeholder="E-mail">
                  <label class="form-label" for="person.contact.email">E-mail:</label>
                  <div id="person.contact.email-validation" class=""></div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col">
                <div class="form-floating">
                  <input onkeyup="viewPersonValidator(this)" class="form-control aof-input form-input needs-validation" type="search" value="${
                    this.doc.person.address.property.address.city.name
                  }" autocomplete="off" id="person.address.property.address.city.name" placeholder="Cidade" required>
                  <label class="form-label" for="person.address.property.address.city.name">Cidade:</label>
                  <div id="person.address.property.address.city.name-validation" class=""></div>
                </div>
                <div id="listCityPill"></div>
              </div>

              <div class="col-md-1">
                <div class="form-floating">
                  <input class="form-control" type="text" value="${
                    this.doc.person.address.property.address.city.name
                  }" id="person.address.property.address.city.state" placeholder="">
                  <label class="form-label" for="person.address.property.addres.city.state">UF:</label>
                </div>
              </div>

              <div class="col">
                <div class="form-floating">
                  <input onkeyup="viewPersonValidator(this)" class="form-control aof-input form-input needs-validation" type="search" value="${
                    this.doc.person.address.property.address.neighborhood.name
                  }" autocomplete="off" id="person.address.property.address.neighborhood.name" placeholder="Bairro" required>
                  <label class="form-label" for="person.address.property.address.neighborhood.name">Bairro:</label>
                  <div id="person.address.property.address.neighborhood.name-validation" class=""></div>
                </div>
                <div id="listNeighborhoodPill"></div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-10">
                <div class="form-floating">
                  <input onkeyup="viewPersonValidator(this)" class="form-control aof-input form-input needs-validation" type="search" value="${
                    this.doc.person.address.property.address.way.name
                  }" autocomplete="off" id="person.address.property.address.way.name" placeholder="Rua/Av." required>
                  <label class="form-label" for="person.address.property.address.way.name">Rua/Av.:</label>
                  <div id="person.address.property.address.way.name-validation" class=""></div>
                </div>
                <div id="listWayPill"></div>
              </div>

              <div class="col-md-2">
                <div class="form-floating">
                  <input class="form-control aof-input form-input" type="search" value="${
                    this.doc.person.address.property.address.number
                  }" autocomplete="off" id="person.address.property.address.number" placeholder="Número">
                  <label class="form-label" for="person.address.property.address.number">Número:</label>
                  <div id="person.address.property.address.number-validation" class=""></div>
                </div>
              </div>
            </div>

          </div> <!-- fim form p-3 -->

          <!-- ==================== DOCUMENTOS DO PACIENTE ==================== -->
<div class="doc-section">
<div class="card shadow-sm mb-3">
  <div class="card-header rounded-top text-center py-3 bg-white">
      <h5 class="mb-0 fw-semibold text-dark">
          Documentos do Paciente
      </h5>
  </div>
</div>



  <!-- ==== DOCUMENTO 1: IDENTIDADE ==== -->
  <div class="doc-card mb-3">
    <div class="doc-header" onclick="toggleDoc('doc_identidade')">
      <span class="doc-title">Documento de Identificação (RG/CPF)</span>

      <span id="doc_identidade_status" class="doc-status"></span>

      <button type="button" id="doc_identidade_btn" class="toggle-btn">Visualizar</button>
    </div>

    <div class="doc-body" id="doc_identidade">
      <input type="file" name="doc_identidade" class="form-control doc-input"
             accept="image/*,application/pdf"
             data-preview="preview_identidade">

      <div class="preview-wrapper" id="preview_identidade_wrapper">
        <div class="preview-box" id="preview_identidade"></div>
      </div>
    </div>
  </div>

  <!-- ==== DOCUMENTO 2: RESIDÊNCIA ==== -->
  <div class="doc-card mb-3">
    <div class="doc-header" onclick="toggleDoc('doc_residencia')">
      <span class="doc-title">Comprovante de Residência</span>

      <span id="doc_residencia_status" class="doc-status"></span>

      <button type="button" id="doc_residencia_btn" class="toggle-btn">Visualizar</button>
    </div>

    <div class="doc-body" id="doc_residencia">
      <input type="file" name="doc_residencia" class="form-control doc-input"
             accept="image/*,application/pdf"
             data-preview="preview_residencia">

      <div class="preview-wrapper" id="preview_residencia_wrapper">
        <div class="preview-box" id="preview_residencia"></div>
      </div>
    </div>
  </div>

  <!-- ==== DOCUMENTO 3: SUS ==== -->
  <div class="doc-card mb-3">
    <div class="doc-header" onclick="toggleDoc('doc_sus')">
      <span class="doc-title">Cartão do SUS</span>

      <span id="doc_sus_status" class="doc-status"></span>

      <button type="button" id="doc_sus_btn" class="toggle-btn">Visualizar</button>
    </div>

    <div class="doc-body" id="doc_sus">
      <input type="file" name="doc_sus" class="form-control doc-input"
             accept="image/*,application/pdf"
             data-preview="preview_sus">

      <div class="preview-wrapper" id="preview_sus_wrapper">
        <div class="preview-box" id="preview_sus"></div>
      </div>
    </div>
  </div>

  <!-- ==== DOCUMENTO 4: LAUDOS (MULTIPLO) ==== -->
  <div class="doc-card mb-4">
    <div class="doc-header" onclick="toggleDoc('doc_laudos')">
      <span class="doc-title">Laudos / Exames (opcional)</span>

      <span id="doc_laudos_status" class="doc-status"></span>

      <button type="button" id="doc_laudos_btn" class="toggle-btn">Visualizar</button>
    </div>

    <div class="doc-body" id="doc_laudos">
      <input type="file" name="doc_laudos" class="form-control doc-input"
             multiple
             accept="image/*,application/pdf"
             data-preview="preview_laudos">

      <div class="preview-wrapper" id="preview_laudos_wrapper">
        <div class="preview-box" id="preview_laudos"></div>
      </div>
    </div>
  </div>

</div>

        </div> <!-- fim scroll-container -->
      </div>

      <div class="card-footer">
        <button class="btn btn-primary form-control" onclick="saveReception(this)">Salvar</button>
      </div>
    </div>

    <img onload="showViewReception()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">

  `;
  }
}
