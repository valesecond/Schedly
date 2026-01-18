// Controle de seleção
let selectedServiceLabel = "";
let selectedTypeLabel = "";
const selections = [];

async function showViewRequestPhase() {
  await serviceSearch();
  document.getElementById("card-summary").style.display = "block";
  renderSelectionsList();
}

async function serviceSearch() {
  console.log("REQDOC", window.reqDoc);

  try {
    const list = await fetchData("/service/search", "GET");
    const container = document.getElementById("servico-container");
    container.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      container.innerHTML = "<p>Nenhum serviço encontrado.</p>";
      return;
    }

    container.className =
      "d-flex flex-wrap justify-content-center align-items-center align-content-center gap-2 mb-4";
    container.innerHTML = list
      .map((item) => {
        const key = item._key ?? item.key;
        const label = item.name ?? item.nome;
        return `
        <button
          class="btn btn-outline-primary rounded-3 fw-semibold fs-6"
          style="min-width:120px; min-height:110px; font-size:1.1rem;"
          data-key="${key}">
          ${label}
        </button>`;
      })
      .join("");

    container
      .querySelectorAll("button")
      .forEach((btn) =>
        btn.addEventListener("click", () => selecionarServico(btn))
      );
  } catch (err) {
    console.error("Erro ao carregar serviços:", err);
    document.getElementById("servico-container").innerHTML =
      "<p>Erro ao carregar os serviços.</p>";
  }
}

function selecionarServico(btn) {
  selectedServiceLabel = btn.textContent.trim();
  document
    .querySelectorAll("#servico-container button")
    .forEach((b) => b.classList.replace("btn-primary", "btn-outline-primary"));
  btn.classList.replace("btn-outline-primary", "btn-primary");
  mostrarOpcoes(btn.getAttribute("data-key"));
}

async function mostrarOpcoes(serviceKey) {
  const old = document.getElementById("options-card");
  if (old) old.remove();

  const container = document.getElementById("servico-container");
  const card = document.createElement("div");
  card.id = "options-card";
  card.className = "card shadow-sm rounded-4 border-0 mb-4";

  const body = document.createElement("div");
  body.className =
    "card-body p-3 d-flex flex-wrap justify-content-center align-items-center gap-2";
  body.style.minHeight = "100px";
  card.append(body);
  container.parentElement.appendChild(card);

  try {
    const tipos = await fetchData(`/service/${serviceKey}/types`, "GET");
    if (!Array.isArray(tipos) || tipos.length === 0) {
      body.innerHTML = "<p>Nenhuma opção encontrada.</p>";
      return;
    }

    body.innerHTML = tipos
      .map((tipo) => {
        const key = tipo._key ?? tipo.key ?? tipo.tipoKey;
        const label = tipo.name ?? tipo.nome;
        return `
        <button
          class="btn btn-outline-primary rounded-3 fw-semibold fs-6"
          style="min-width:100px; min-height:50px; font-size:1rem;"
          data-key="${key}">
          ${label}
        </button>`;
      })
      .join("");

    body
      .querySelectorAll("button")
      .forEach((btn) =>
        btn.addEventListener("click", () => selecionarTipo(btn))
      );
  } catch (err) {
    console.error("Erro ao buscar opções:", err);
    body.innerHTML = "<p>Erro ao carregar opções.</p>";
  }
}

function selecionarTipo(btn) {
  selectedTypeLabel = btn.textContent.trim();

  // lê o _key que veio em data-key do próprio botão
  const typeServiceKey = btn.getAttribute("data-key");

  // monta o objeto incluindo o label E o key
  const entry = {
    service: selectedServiceLabel,
    typeService: {
      name: selectedTypeLabel,
      _key: typeServiceKey,
    }, // ← armazena o _key aqui
  };

  // inicializa a estrutura se necessário
  if (!window.reqDoc) window.reqDoc = {};
  if (!window.reqDoc.requestPhase) window.reqDoc.requestPhase = {};
  const arr = (window.reqDoc.requestPhase.medicalRequest =
    window.reqDoc.requestPhase.medicalRequest || []);

  arr.push(entry);

  document.getElementById("servico-container").innerHTML = "";
  const oldCard = document.getElementById("options-card");
  if (oldCard) oldCard.remove();

  serviceSearch();
  renderSelectionsList();
}

function selectConduct(radio) {
  const hidden = document.getElementById("requestPhase.conduct");
  if (hidden) {
    hidden.value = radio.value;
  }
}

async function saveRequestPhase(element) {
  console.log("ENTROU NO SAVE");
  const form = await formCopy();
  const userPropertyRaw = get_property_from_storage("user");
  const userProperty = {
    iat: userPropertyRaw.iat,
    _key: userPropertyRaw.sub,
    name: userPropertyRaw.person.name,
    person: userPropertyRaw.person,
    activeSession: userPropertyRaw.activeSession,
  };
  form.userProperty = userProperty;
  const data = form;
  console.log("Data:", data);
  await save("/requestPhase", data);
  console.log("Data:", data);
  window.open(`/requestPhase/list`, "_self");
}

function renderSelectionsList() {
  const container = document.getElementById("summary-list");
  if (!container) {
    console.error("Elemento #summary-list não encontrado.");
    return;
  }

  container.innerHTML = "";
  document
    .querySelectorAll(".tmp-hidden-checkbox")
    .forEach((el) => el.remove());

  const arr =
    window.reqDoc &&
    window.reqDoc.requestPhase &&
    Array.isArray(window.reqDoc.requestPhase.medicalRequest)
      ? window.reqDoc.requestPhase.medicalRequest
      : [];

  if (arr.length === 0) {
    container.innerHTML = `
      <div class="col" style="max-width: 250px;">
        <div class="card border-dashed text-center py-4">
          <p class="text-muted mb-0">Nenhuma seleção feita.</p>
        </div>
      </div>`;
    return;
  }

  arr.forEach((sel, idx) => {
    if (!sel.createdAt) sel.createdAt = new Date().toISOString();
    if (sel.isReturn === undefined) sel.isReturn = false;
    if (sel.isReferral === undefined) sel.isReferral = false;
    if (!Array.isArray(sel.requisitionDetail)) sel.requisitionDetail = [];

    if (
      sel.typeService &&
      typeof sel.typeService.name === "string" &&
      sel.typeService.name.trim().toLowerCase() === "obstetrícia"
    ) {
      if (sel.highRiskPregnancy === undefined) sel.highRiskPregnancy = false;
    } else {
      delete sel.highRiskPregnancy;
    }

    if (
      sel.typeService &&
      typeof sel.typeService.name === "string" &&
      sel.typeService.name.trim().toLowerCase() === "ginecologia"
    ) {
      if (sel.colposcopia === undefined) sel.colposcopia = false;
    } else {
      delete sel.colposcopia;
    }

    const createdAt = new Date(sel.createdAt);
    const formattedTimestamp = createdAt.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // 4.3) Cria col/card
    const col = document.createElement("div");
    col.className = "col";
    col.style.maxWidth = "85%";

    const card = document.createElement("div");
    card.className =
      "card h-100 shadow-sm border-primary border-1 rounded-4 d-flex flex-column";

    const body = document.createElement("div");
    body.className = "card-body d-flex flex-column";

    // 4.4) Monta HTML interno
    body.innerHTML = `
      <div class="d-flex justify-content-between mb-1">
        <div>
          <h6 class="card-title mb-1 text-primary">${sel.service}</h6>
          <p class="card-text text-primary small mb-0">${
            sel.typeService.name
          }</p>
        </div>
        <div class="d-flex flex-column flex-grow-1 align-items-end position-relative">
          <div id="tag-input-container-${idx}"
              class="tag-input-container d-flex flex-wrap align-items-center w-100"
              style="padding:2px 4px;border:1px solid #ced4da;border-radius:.25rem;max-width:82%;">
            <input
              type="text"
              id="detail-${idx}"
              class="form-control form-control-sm border-0 p-0 m-0 flex-grow-1"
              placeholder="Detalhamento..."
              style="min-width:80px;outline:none;"
            >
          </div>
          <input
            type="hidden"
            id="detail-id-${idx}"
            name="requestPhase.medicalRequest[${idx}].requisitionDetailKeys"
            value=""
          />
          <div
            id="detail-suggestions-${idx}"
            class="detail-suggestions-box position-absolute"
            style="display:none;padding:4px 8px;border:1px solid #ced4da;border-radius:.25rem;
                   box-shadow:0 4px 12px rgba(0,0,0,0.1);top:calc(100%+4px);right:0;width:82%;z-index:20;"
          ></div>
        </div>
      </div>

      <div class="mb-3">
        <div class="form-check mb-1">
          <input
            class="form-check-input"
            type="checkbox"
            id="return-${idx}"
            ${sel.isReturn ? "checked" : ""}
          >
          <label class="form-check-label" for="return-${idx}">Retorno</label>
        </div>
        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            id="referral-${idx}"
            ${sel.isReferral ? "checked" : ""}
          >
          <label class="form-check-label" for="referral-${idx}">Encaminhamento Médico</label>
        </div>

        ${
          sel.highRiskPregnancy !== undefined
            ? `<div class="form-check mt-1">
                 <input class="form-check-input" type="checkbox" id="high-risk-${idx}"
                   ${sel.highRiskPregnancy ? "checked" : ""}>
                 <label class="form-check-label" for="high-risk-${idx}">Gravidez de Risco</label>
               </div>`
            : ""
        }

       <div class="mt-2 w-25">
        <label class="form-label small mb-1">Anexar Documento</label>
        <input 
          type="file"
          id="file-${idx}"
          class="form-control form-control-sm"
          accept=".pdf,.jpg,.jpeg,.png"
        >
        <div id="file-preview-${idx}" class="small text-muted mt-1"></div>
      </div>

        ${
          sel.colposcopia !== undefined
            ? `<div class="form-check mt-1">
                 <input class="form-check-input" type="checkbox" id="colpo-${idx}"
                   ${sel.colposcopia ? "checked" : ""}>
                 <label class="form-check-label" for="colpo-${idx}">Colposcopia</label>
               </div>`
            : ""
        }
      </div>

      <div class="d-flex justify-content-between align-items-center pt-2">
        <p class="card-text text-muted small mb-0 d-flex align-items-center">
          <i class="bi bi-clock me-1"></i>${formattedTimestamp}
        </p>
        <button class="btn btn-sm btn-outline-danger px-1 py-0 delete-item" data-idx="${idx}" title="Excluir">
          <i class="bi bi-trash-fill fs-6"></i>
        </button>
      </div>
    `;

    // 5) Excluir card
    body.querySelector(".delete-item").addEventListener("click", () => {
      window.reqDoc.requestPhase.medicalRequest.splice(idx, 1);
      renderSelectionsList();
    });

    // 6) Flags Retorno/Encaminhamento
    body.querySelector(`#return-${idx}`).addEventListener("change", (e) => {
      sel.isReturn = e.target.checked;
      updateHiddenInput(idx, sel);
    });
    body.querySelector(`#referral-${idx}`).addEventListener("change", (e) => {
      sel.isReferral = e.target.checked;
      updateHiddenInput(idx, sel);
    });

    // 7) Checkbox Gravidez de Risco
    if (sel.highRiskPregnancy !== undefined) {
      body
        .querySelector(`#high-risk-${idx}`)
        .addEventListener("change", (e) => {
          sel.highRiskPregnancy = e.target.checked;
          updateHiddenInput(idx, sel);
        });
    }

    // 8) Checkbox Colposcopia
    if (sel.colposcopia !== undefined) {
      body.querySelector(`#colpo-${idx}`).addEventListener("change", (e) => {
        sel.colposcopia = e.target.checked;
        updateHiddenInput(idx, sel);
      });
    }

    // 9) Insere no DOM
    card.append(body);
    col.append(card);
    container.append(col);

    // 10) Hidden aggregate
    insertHiddenInput(idx, sel);

    // ─── INJEÇÃO NECESSÁRIA ───
    const tagContainer = body.querySelector(`#tag-input-container-${idx}`);
    const detailInput = body.querySelector(`#detail-${idx}`);
    const hiddenInput = body.querySelector(`#detail-id-${idx}`);
    const suggestionsConta = body.querySelector(`#detail-suggestions-${idx}`);

    // 8.1) (Opcional) Se já houver itens em sel.requisitionDetail, renderiza as pills iniciais
    sel.requisitionDetail.forEach((rd) => {
      createTagPill(idx, rd._key, rd.name);
    });
    // Atualiza o hidden com as keys iniciais
    syncHiddenRequisitionDetail(idx);

    // 8.2) Quando o usuário digita, busca sugestões
    detailInput.addEventListener("input", async (e) => {
      const query = e.target.value.trim();
      if (query === "") {
        suggestionsConta.style.display = "none";
        suggestionsConta.innerHTML = "";
        return;
      }
      await showDetail(idx, query);
    });

    // 8.3) Se o usuário clicar fora (blur) no input, esconde sugestões após breve delay
    detailInput.addEventListener("blur", () => {
      // delay para permitir que o clique numa sugestão seja registrado
      setTimeout(() => {
        suggestionsConta.style.display = "none";
      }, 150);
    });

    // 8.4) Se o usuário voltar a focar o input, limpamos sugestões e deixamos o container pronto
    detailInput.addEventListener("focus", () => {
      suggestionsConta.style.display = "none";
      suggestionsConta.innerHTML = "";
    });

    // 8.5) Ao apertar “Backspace” com input vazio, removemos a última pill selecionada
    detailInput.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && detailInput.value === "") {
        // remove última tag
        const pills = tagContainer.querySelectorAll(".pill");
        if (pills.length > 0) {
          const lastPill = pills[pills.length - 1];
          const keyToRemove = lastPill.dataset.key;
          lastPill.remove();
          // também remove do array sel.requisitionDetail
          sel.requisitionDetail = sel.requisitionDetail.filter(
            (rd) => rd._key !== keyToRemove
          );
          syncHiddenRequisitionDetail(idx);
        }
      }
    });

    // 8.6) Função que cria uma pill dentro do tagContainer
    function createTagPill(cardIdx, pillKey, pillName) {
      const span = document.createElement("span");
      span.className = "pill";
      span.dataset.key = pillKey;
      span.innerHTML = `
        <span>${pillName}</span>
        <i class="bi bi-x remove-pill" style="font-size: 0.75rem; margin-left: 0.25rem;"></i>
      `;
      // Ao clicar no “x”, remove esta pill
      span.querySelector(".remove-pill").addEventListener("click", () => {
        span.remove();
        // remove do array sel.requisitionDetail
        sel.requisitionDetail = sel.requisitionDetail.filter(
          (rd) => rd._key !== pillKey
        );
        syncHiddenRequisitionDetail(cardIdx);
      });
      // Insere antes do input, para que o input fique por último
      detailInput.before(span);
    }

    // 8.7) Sincroniza o hidden-input com todas as keys
    function syncHiddenRequisitionDetail(cardIdx) {
      const arrKeys = sel.requisitionDetail.map((rd) => rd._key);
      hiddenInput.value = arrKeys.join(",");
      updateHiddenInput(cardIdx, sel);
    }

    // 8.8) Função showDetail (busca sugestões e insere via insertOnePill)
    async function showDetail(cardIdx, queryText) {
      try {
        // Recupera typeServiceKey do próprio sel (ou adapte conforme seu modelo)
        const typeService_key = sel.typeService._key || "";

        const payload = {
          name: queryText,
          typeService_key: typeService_key,
        };

        const listFilter = await fetchData("/detail/search", "PUT", payload);

        suggestionsConta.innerHTML = "";
        suggestionsConta.style.display = "block";

        listFilter.forEach((item) => {
          insertOnePill(
            `detail-suggestions-${cardIdx}`, // ID do <div> de sugestões
            item._key, // id clicável
            item.name, // texto exibido na pill
            () => {},
            (id, value) => {
              // 1) Cria uma nova tag dentro do campo (somente se ainda não existir)
              const already = sel.requisitionDetail.find(
                (rd) => rd._key === id
              );
              if (!already) {
                sel.requisitionDetail.push({ _key: id, name: value });
                createTagPill(cardIdx, id, value);
                syncHiddenRequisitionDetail(cardIdx);
              }
              // 2) Limpa o input de texto e esconde sugestões
              detailInput.value = "";
              suggestionsConta.innerHTML = "";
              suggestionsConta.style.display = "none";
            }
          );
        });

        // 7) Se não houver resultados, exibe “Nenhum resultado encontrado.”
        if (listFilter.length === 0) {
          const noneDiv = document.createElement("div");
          noneDiv.className = "text-muted small ps-2 pt-1";
          noneDiv.textContent = "Nenhum resultado encontrado.";
          suggestionsConta.appendChild(noneDiv);
        }
      } catch (error) {
        console.error("Erro ao buscar sugestões de detalhamento:", error);
      }
    }
  });

  // Atualiza o hidden-input ao mudar qualquer flag
  function updateHiddenInput(idx, sel) {
    const name = "requestPhase.medicalRequest";
    const inputs = Array.from(
      document.querySelectorAll(`.tmp-hidden-checkbox[name="${name}"]`)
    );
    const existing = inputs[idx];
    if (existing) {
      existing.value = JSON.stringify({
        service: sel.service,
        typeService: sel.typeService,
        isReturn: sel.isReturn,
        isReferral: sel.isReferral,
        requisitionDetail: sel.requisitionDetail,
        highRiskPregnancy: sel.highRiskPregnancy ?? false,
        colposcopia: sel.colposcopia ?? false,
      });
    }
  }

  // Cria o hidden-input (aggregate) com todos os campos
  function insertHiddenInput(idx, sel) {
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = true;
    chk.classList.add("tmp-hidden-checkbox", "aof-input-aggregate");
    chk.name = "requestPhase.medicalRequest";
    chk.value = JSON.stringify({
      service: sel.service,
      typeService: sel.typeService,
      isReturn: sel.isReturn,
      isReferral: sel.isReferral,
      requisitionDetail: sel.requisitionDetail,
      highRiskPregnancy: sel.highRiskPregnancy ?? false,
      colposcopia: sel.colposcopia ?? false,
    });
    chk.style.display = "none";
    document.body.appendChild(chk);
  }
}

async function showDetail(idx, query) {
  try {
    const detail_key = document.getElementById(`detail-id-${idx}`).value;

    const medRequest = window.reqDoc.requestPhase.medicalRequest[idx];
    const typeService_key = medRequest.typeServiceKey || "";

    const payload = {
      name: query,
      detail_key: detail_key,
      typeService_key: typeService_key,
    };

    console.log("VEJAAA:", payload);

    const listFilter = await fetchData("/detail/search", "PUT", payload);

    const container = document.getElementById(`detail-suggestions-${idx}`);
    container.innerHTML = "";

    listFilter.forEach((item) => {
      insertOnePill(
        `detail-suggestions-${idx}`, // ID do <div> onde as pills serão inseridas
        item._key, // “id” passado ao selectCallback
        item.name, // texto exibido na pill
        () => {},
        (id, value) => {
          document.getElementById(`detail-${idx}`).value = value;
          document.getElementById(`detail-id-${idx}`).value = id;
          container.innerHTML = "";
        }
      );
    });

    // 7) Se não houver resultados, exibe “Nenhum resultado encontrado.”
    if (listFilter.length === 0) {
      const noneDiv = document.createElement("div");
      noneDiv.className = "text-muted small ps-2 pt-1";
      noneDiv.textContent = "Nenhum resultado encontrado.";
      container.appendChild(noneDiv);
    }
  } catch (error) {
    console.error("Erro ao buscar sugestões de detalhamento:", error);
  }
}
