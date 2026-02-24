async function openSchedulingScreen() {
  await fetchAndRenderUnitsHierarchy();
}

let selectedServiceData = null;

let allUnitsData = [];
let currentUnitsData = [];

async function fetchAndRenderUnitsHierarchy() {
  const container = document.getElementById("unitsContainer");
  if (!container) {
    console.error("Container #unitsContainer não encontrado.");
    return;
  }

  try {
    allUnitsData = await fetchData("/attendanceUnit/search", "GET");
    currentUnitsData = [...allUnitsData];

    initUnitsFilterControls(allUnitsData);

    renderUnitsHierarchy(currentUnitsData);
  } catch (err) {
    console.error("Erro ao carregar unidades:", err);
    alert("Não foi possível carregar a lista de unidades.");
  }
}

function initUnitsFilterControls(units) {
  const inp = document.getElementById("unitsSearch");
  const sel = document.getElementById("unitsCityFilter");
  const btnClear = document.getElementById("unitsClear");

  if (!inp || !sel || !btnClear) return;

  const cities = Array.from(
    new Set(
      (units || [])
        .map((u) => (u.city || "").trim())
        .filter((c) => c.length > 0)
        .map((c) => c.toUpperCase()),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  // limpa e repopula
  sel.innerHTML = `<option value="">Todas as cidades</option>`;
  cities.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });

  // Eventos
  const applyUnitsFilters = () => {
    const term = (inp.value || "").trim().toLowerCase();
    const city = (sel.value || "").trim().toUpperCase();

    const filtered = (allUnitsData || []).filter((unit) => {
      // 1) filtro de cidade
      if (city && (unit.city || "").trim().toUpperCase() !== city) {
        return false;
      }

      // 2) filtro por termo (APENAS nome/cidade)
      if (!term) return true;

      const unitName = (unit.name || "").toLowerCase();
      const unitCity = (unit.city || "").toLowerCase();

      const haystack = `${unitName} ${unitCity}`.toLowerCase();
      return haystack.includes(term);
    });

    currentUnitsData = filtered;
    renderUnitsHierarchy(currentUnitsData);
  };

  // debounce leve pra não renderizar a cada tecla muito rápido
  let t = null;
  inp.oninput = () => {
    clearTimeout(t);
    t = setTimeout(applyUnitsFilters, 120);
  };

  sel.onchange = applyUnitsFilters;

  btnClear.onclick = () => {
    inp.value = "";
    sel.value = "";
    applyUnitsFilters();
    inp.focus();
  };

  // aplica logo pra setar contador
  applyUnitsFilters();
}

function renderUnitsHierarchy(units) {
  const container = document.getElementById("unitsContainer");
  if (!container) return;

  container.innerHTML = "";

  container.style.paddingBottom = "24px";
  // ✅ ordena (pt-BR) e limita a 7, SEM alterar layout
  const toRender = (units || [])
    .slice()
    .sort((a, b) =>
      (a?.name || "").localeCompare(b?.name || "", "pt-BR", {
        sensitivity: "base",
      }),
    )
    .slice(0, 7);

  // contador (mantém como está: mostra o total filtrado, não só os 7)
  const countEl = document.getElementById("unitsCount");
  if (countEl) countEl.textContent = String(units?.length || 0);

  // layout simples bonito
  container.classList.add("row");
  container.style.gap = "12px";

  (toRender || []).forEach((unit) => {
    // card/botão clicável
    const cardBtn = document.createElement("button");
    cardBtn.type = "button";
    cardBtn.className = "btn text-start p-3 shadow-sm border bg-white";
    cardBtn.style.borderRadius = "12px";
    cardBtn.style.cursor = "pointer";
    cardBtn.style.width = "100%";
    cardBtn.style.transition = "transform .15s ease, box-shadow .15s ease";

    cardBtn.innerHTML = `
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
               style="width:38px;height:38px;">
            <i class="bi bi-building"></i>
          </div>
          <div>
            <div class="fw-bold" style="font-size:1rem;">${unit.name || "—"}</div>
            <div class="text-muted" style="font-size:.85rem;">${unit.city || ""}</div>
          </div>
        </div>
        <i class="bi bi-chevron-right text-primary"></i>
      </div>
    `;

    cardBtn.addEventListener("mouseover", () => {
      cardBtn.style.transform = "translateY(-1px)";
      cardBtn.style.boxShadow = "0 6px 18px rgba(0,0,0,.08)";
    });
    cardBtn.addEventListener("mouseout", () => {
      cardBtn.style.transform = "translateY(0)";
      cardBtn.style.boxShadow = "";
    });

    // ✅ clique na unidade = segue direto
    cardBtn.addEventListener("click", async () => {
      if (!unit?._key) {
        alert("Unidade inválida.");
        console.error("Unit sem _key:", unit);
        return;
      }

      const pickedServiceInfo = {
        unit: { _key: unit._key, name: unit.name },
        service: null,
        serviceType: null,
        specialist: null,
      };

      selectedServiceData = pickedServiceInfo;
      window.selectedServiceData = pickedServiceInfo;

      await submitSelectedService(pickedServiceInfo);
    });

    container.appendChild(cardBtn);
  });
}

async function submitSelectedService(pickedServiceInfo) {
  if (!pickedServiceInfo) return;

  const userPropertyRaw = get_property_from_storage("user");

  const userProperty = {
    iat: userPropertyRaw.iat,
    _key: userPropertyRaw.sub,
    name: userPropertyRaw.person.name,
    person: userPropertyRaw.person,
    activeSession: userPropertyRaw.activeSession,
  };

  pickedServiceInfo.userProperty = userProperty;

  try {
    const { promiseServices, inProcessDocs } = await fetchData(
      "/service/promise/by-unit",
      "PUT",
      pickedServiceInfo,
    );
    console.log("✅ Resposta do backend:", { promiseServices, inProcessDocs });

    // GUARDA para usar depois no PDF
    currentPromiseService = promiseServices[0];

    // 2) Renderiza a tela de agendamento
    renderSchedulingWorkspace(
      promiseServices,
      inProcessDocs,
      pickedServiceInfo,
    );
  } catch (error) {
    console.error("❌ Erro ao enviar dados:", error);
    alert("Erro ao enviar os dados selecionados.");
  }
}

async function renderSchedulingWorkspace(
  promiseServices,
  inProcessDocs,
  pickedServiceInfo,
) {
  // -----------------------------
  // normaliza entradas
  // -----------------------------
  promiseServices = Array.isArray(promiseServices) ? promiseServices : [];
  inProcessDocs = Array.isArray(inProcessDocs) ? inProcessDocs : [];

  // -----------------------------
  // refs da tela
  // -----------------------------
  const sc = document.getElementById("schedulingContainer");
  const gridPac = document.getElementById("gridPacientes"); // coluna ESQ
  const rightCol = document.getElementById("colAgendados"); // coluna DIR (form)
  const gridRight = document.getElementById("gridAgendados"); // dentro da DIR
  const searchInp = document.getElementById("searchPaciente");

  // ✅ board de viagens (abaixo)
  const tripsList = document.getElementById("tripsList");
  const tripsCount = document.getElementById("tripsCount");

  // troca de tela
  const unitsContainer = document.getElementById("unitsContainer");
  const unitsFilterCard = document.getElementById("unitsFilterCard");
  if (unitsContainer) unitsContainer.style.display = "none";
  if (unitsFilterCard) unitsFilterCard.style.display = "none";
  if (sc) sc.style.display = "block";

  // limpa
  if (gridPac) gridPac.innerHTML = "";
  if (gridRight) gridRight.innerHTML = "";
  if (rightCol) rightCol.style.display = "none";
  if (tripsList) tripsList.innerHTML = "";
  if (tripsCount) tripsCount.textContent = "0";

  // remove header antigo
  const existingHeader = document.getElementById("schedulingHeader");
  if (existingHeader) existingHeader.remove();

  // -----------------------------
  // util: texto seguro
  // -----------------------------
  function safeText(v) {
    const s = (v || "").toString().trim();
    return s ? s : "—";
  }

  // -----------------------------
  // util: formata data
  // -----------------------------
  function fmtBR(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR");
  }

  // -----------------------------
  // pega o "próximo agendamento" (mais cedo)
  // -----------------------------
  function getNextSched(doc) {
    const arr = Array.isArray(doc?.schedulingPhase) ? doc.schedulingPhase : [];
    if (arr.length === 0) return null;

    const sorted = arr
      .filter((s) => s?.start?.date)
      .slice()
      .sort((a, b) => (a.start.date || "").localeCompare(b.start.date || ""));

    return sorted[0] || null;
  }

  // -----------------------------
  // estado: selecionados
  // -----------------------------
  const selected = new Map(); // personKey -> { inProcessKey, personKey, person, sched }

  // ✅ viagens (agora: criadas pelo backend, mas mantemos array local pra render)
  const trips = [];
  let activeTripId = null;

  function syncCreateTripButtons() {
    const btnSubmit = document.getElementById("tripSubmit");
    if (!btnSubmit) return;

    // se estiver editando uma viagem existente: pode salvar mesmo sem selected
    if (activeTripId) {
      btnSubmit.disabled = false;
      return;
    }

    // criando nova: precisa ter pelo menos 1 pessoa selecionada
    btnSubmit.disabled = selected.size === 0;
  }

  // -----------------------------
  // header
  // -----------------------------
  const header = document.createElement("div");
  header.id = "schedulingHeader";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "12px";
  header.style.margin = "0 auto 1rem";
  header.style.maxWidth = "1100px";
  header.style.padding = "0.8rem 1rem";
  header.style.background = "#ffffff";
  header.style.borderRadius = "0.75rem";
  header.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";

  header.innerHTML = `
    <div>
      <div style="font-size:1.2rem; font-weight:800; color:#0d6efd;">
        ${pickedServiceInfo?.unit?.name || "—"}
      </div>
      <div style="font-size:.85rem; font-weight:500; color:#6c757d;">
        ${pickedServiceInfo?.unit?._key ? `UNIDADE: ${pickedServiceInfo.unit._key}` : ""}
      </div>
    </div>
  `;
  if (sc) sc.prepend(header);

  if (rightCol) rightCol.style.display = "block";
  if (gridRight) gridRight.classList.add("row");
  if (gridPac) gridPac.classList.add("row");

  function renderTripsBoard() {
    if (!tripsList) return;

    tripsList.innerHTML = "";
    if (tripsCount) tripsCount.textContent = String(trips.length);

    if (trips.length === 0) {
      const empty = document.createElement("div");
      empty.className = "col-12";
      empty.innerHTML = `
        <div class="text-muted small">
          Nenhuma viagem criada ainda. Selecione pessoas à esquerda e clique em <b>Criar viagem</b>.
        </div>
      `;
      tripsList.appendChild(empty);
      return;
    }

    trips
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .forEach((t) => {
        const col = document.createElement("div");
        col.className = "col-12 col-md-6 col-xl-4";

        const statusBadge =
          t.status === "REALIZADA"
            ? `<span class="badge bg-success">REALIZADA</span>`
            : `<span class="badge bg-warning text-dark">PENDENTE</span>`;

        const dt = t.tripDate ? fmtBR(t.tripDate) : "—";

        col.innerHTML = `
          <div class="card shadow-sm h-100" style="border-radius:14px; cursor:pointer;">
            <div class="card-body">
              <div class="d-flex align-items-start justify-content-between gap-2">
                <div class="overflow-hidden" style="min-width:0;">
                  <div class="fw-bold text-truncate">${safeText(t.name) || "Viagem sem nome"}</div>
                  <div class="text-muted small text-truncate">
                    ${safeText(t.destination)} • ${dt}
                  </div>
                </div>
                <div>${statusBadge}</div>
              </div>

              <div class="mt-2 small text-muted">
                <div><i class="bi bi-person-badge me-1"></i>${safeText(t.driver)}</div>
                <div><i class="bi bi-truck-front me-1"></i>${safeText(t.vehicle)}</div>
                <div><i class="bi bi-people me-1"></i>${t.persons?.length || 0} pessoa(s)</div>
              </div>
            </div>
          </div>
        `;

        col.firstElementChild?.addEventListener("click", () => {
          openTripForEdit(t.id);
        });

        tripsList.appendChild(col);
      });
  }

  function openTripForEdit(tripId) {
    activeTripId = tripId;
    renderTripForm();
  }

  function renderTripForm() {
    if (!gridRight) return;

    gridRight.innerHTML = "";

    const unitName = pickedServiceInfo?.unit?.name || "Unidade";

    function guessMainService() {
      const counts = {};
      for (const x of selected.values()) {
        const serv =
          x?.sched?.serviceType?.nome || x?.sched?.serviceType?.name || null;
        if (!serv) continue;
        counts[serv] = (counts[serv] || 0) + 1;
      }
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return entries[0]?.[0] || "Serviço";
    }

    function buildTripName(unitName, serviceLabel, tripDate, count) {
      const c = Number(count || 0);
      return `${unitName} • ${serviceLabel} • (${c} pessoa${c === 1 ? "" : "s"})`;
    }

    const editingTrip = activeTripId
      ? trips.find((t) => String(t.id) === String(activeTripId)) || null
      : null;

    const isEditing = !!editingTrip;

    const mainService = isEditing
      ? editingTrip.mainService || "Serviço"
      : guessMainService();

    const wrap = document.createElement("div");
    wrap.className = "col-12";

    wrap.innerHTML = `
      <div class="card shadow-sm border-0" style="border-radius:14px;">
        <div class="card-body p-3">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <h6 class="m-0 fw-bold text-primary">
              <i class="bi bi-truck me-2"></i> ${isEditing ? "Editar viagem" : "Nova viagem"}
            </h6>

            ${
              isEditing
                ? `
              <span class="badge ${
                editingTrip.status === "REALIZADA"
                  ? "bg-success"
                  : "bg-warning text-dark"
              }">
                ${safeText(editingTrip.status)}
              </span>
            `
                : ""
            }
          </div>

          <div class="mb-2">
            <label class="form-label mb-1">Nome da viagem</label>
            <input id="tripName" class="form-control" placeholder="Ex: CLINCORDIS • Cardiologia • 30/01/2026 (2 pessoas)" />
            <div class="form-text">Você pode editar. Se estiver vazio, ele é sugerido.</div>
          </div>

          <div class="row g-2">
            <div class="col-12">
              <label class="form-label mb-1">Motorista</label>
              <input id="tripDriver" class="form-control" placeholder="Nome do motorista" />
            </div>
            <div class="col-12">
              <label class="form-label mb-1">Destino</label>
              <input id="tripDestination" class="form-control" placeholder="Local de destino" />
            </div>
            <div class="col-6">
              <label class="form-label mb-1">Data da viagem</label>
              <input id="tripDate" type="date" class="form-control" />
            </div>
            <div class="col-6">
              <label class="form-label mb-1">Veículo</label>
              <input id="tripVehicle" class="form-control" placeholder="Ex: VAN - ABC1D23" />
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-3">
            ${
              isEditing
                ? `
              <button id="tripMarkDone" class="btn btn-outline-success btn-sm">
                <i class="bi bi-check2-circle me-1"></i> Marcar como realizada
              </button>
              <button id="tripDelete" class="btn btn-outline-danger btn-sm">
                <i class="bi bi-trash me-1"></i> Excluir
              </button>
            `
                : `
              <button id="tripClear" class="btn btn-outline-secondary btn-sm">Limpar</button>
            `
            }
            <button id="tripSubmit" class="btn btn-primary btn-sm" disabled>
              <i class="bi bi-save2 me-1"></i> ${
                isEditing ? "Salvar alterações" : "Criar viagem"
              }
            </button>
          </div>
        </div>
      </div>
    `;

    gridRight.appendChild(wrap);
    syncCreateTripButtons();

    const tripNameEl = document.getElementById("tripName");
    const tripDriverEl = document.getElementById("tripDriver");
    const tripDestEl = document.getElementById("tripDestination");
    const tripDateEl = document.getElementById("tripDate");
    const tripVehEl = document.getElementById("tripVehicle");

    function setSuggestedNameIfEmpty(force = false) {
      if (!tripNameEl) return;
      const current = (tripNameEl.value || "").trim();
      if (current && !force) return;

      const tripDate = tripDateEl?.value || "";
      const count = isEditing
        ? editingTrip.persons?.length || 0
        : selected.size;
      tripNameEl.value = buildTripName(unitName, mainService, tripDate, count);
    }

    if (isEditing) {
      tripNameEl.value = editingTrip.name || "";
      tripDriverEl.value = editingTrip.driver || "";
      tripDestEl.value = editingTrip.destination || "";
      tripDateEl.value = editingTrip.tripDate || "";
      tripVehEl.value = editingTrip.vehicle || "";
      if (!tripNameEl.value.trim()) setSuggestedNameIfEmpty(true);
    } else {
      setSuggestedNameIfEmpty(true);
    }

    if (tripDateEl) {
      tripDateEl.addEventListener("change", () =>
        setSuggestedNameIfEmpty(false),
      );
    }

    const btnClear = document.getElementById("tripClear");
    if (btnClear) {
      btnClear.onclick = () => {
        selected.clear();

        gridPac?.querySelectorAll?.(".paciente-card")?.forEach((c) => {
          c.classList.remove("border-primary");
          c.style.boxShadow = "";
          c.style.backgroundColor = "#fff";
        });

        activeTripId = null;
        syncCreateTripButtons();
        renderTripForm();
      };
    }

    const btnDone = document.getElementById("tripMarkDone");
    if (btnDone && isEditing) {
      btnDone.onclick = () => {
        editingTrip.status = "REALIZADA";
        renderTripForm();
        renderTripsBoard();
      };
    }

    const btnDelete = document.getElementById("tripDelete");
    if (btnDelete && isEditing) {
      btnDelete.onclick = () => {
        const idx = trips.findIndex(
          (t) => String(t.id) === String(editingTrip.id),
        );
        if (idx >= 0) trips.splice(idx, 1);
        activeTripId = null;
        renderTripForm();
        renderTripsBoard();
      };
    }

    // ✅ SUBSTITUA APENAS o trecho do btnSubmit.onclick (parte de CRIAÇÃO)
    // dentro do seu renderTripForm(), mantendo o resto igual.

    const btnSubmit = document.getElementById("tripSubmit");
    if (btnSubmit) {
      btnSubmit.onclick = async () => {
        const name = (tripNameEl?.value || "").trim();
        const driver = (tripDriverEl?.value || "").trim();
        const destination = (tripDestEl?.value || "").trim();
        const tripDate = (tripDateEl?.value || "").trim();
        const vehicle = (tripVehEl?.value || "").trim();

        if (!name) return alert("Informe o nome da viagem.");
        if (!driver) return alert("Informe o motorista.");
        if (!vehicle) return alert("Informe o veículo.");

        if (isEditing) {
          editingTrip.name = name;
          editingTrip.driver = driver;
          editingTrip.destination = destination;
          editingTrip.tripDate = tripDate;
          editingTrip.vehicle = vehicle;

          renderTripsBoard();
          alert("Viagem atualizada ✅");
          return;
        }

        // ✅ CRIAÇÃO (AGORA COM BANCO)
        if (selected.size === 0) {
          alert("Selecione pelo menos 1 pessoa.");
          return;
        }

        // ✅ pega personKey pelo Map (entries) e não só pelo objeto person
        const persons = Array.from(selected.values())
          .map((x) => ({
            inProcessKey: x?.inProcessKey || null,
            personKey: x?.person?._key || null,
            personName: x?.person?.name || null,
            start: x.sched?.start || null,
            serviceType: x.sched?.serviceType || null,
            promiseService: x.sched?.promiseService || null,
          }))
          .filter((p) => p.personKey && p.inProcessKey);

        if (persons.length === 0) {
          console.log("DEBUG selected map:", Array.from(selected.entries()));
          alert("Nenhuma pessoa válida selecionada.");
          return;
        }

        // ✅ valida se veio inProcessKey (se teu backend exigir)
        const missingInProcess = persons.some((p) => !p.inProcessKey);
        if (missingInProcess) {
          console.log("DEBUG persons:", persons);
          alert(
            "Algum selecionado está sem inProcessKey. Verifique o doc._key do InProcess.",
          );
          return;
        }

        const payload = {
          unit: {
            _key: pickedServiceInfo?.unit?._key,
            name: pickedServiceInfo?.unit?.name,
          },
          name,
          driver,
          destination,
          tripDate,
          vehicle,
          status: "PENDENTE",
          mainService,
          persons,
          userProperty: pickedServiceInfo?.userProperty || null,
        };

        console.log("payload:", payload);

        btnSubmit.disabled = true;

        try {
          const resp = await fetchData(
            "/transportPhase/createTravel",
            "PUT",
            payload,
          );
          const created = resp?.travel;

          if (!created?._key) {
            console.error("Resposta inesperada /createTravel:", resp);
            alert("Não foi possível criar a viagem (resposta inválida).");
            syncCreateTripButtons();
            return;
          }

          // ✅ adiciona no board
          trips.push({
            id: String(created._key),
            name: created.name,
            driver: created.driver,
            destination: created.destination,
            tripDate: created.tripDate,
            vehicle: created.vehicle,
            status: created.status,
            mainService: created.mainService,
            persons: created.persons || persons,
            createdAt: created.createdAt || Date.now(),
            _id: created._id,
            _rev: created._rev,
          });

          // ✅ remove da listagem de pacientes na hora (os que entraram na viagem)
          const personKeysToRemove = persons
            .map((p) => p.personKey)
            .filter(Boolean);
          personKeysToRemove.forEach((pk) => {
            const card = gridPac?.querySelector?.(
              `.paciente-card[data-key="${pk}"]`,
            );
            const wrap = card?.closest?.(".col-12");
            if (wrap) wrap.remove();
          });

          // ✅ limpa seleção
          selected.clear();

          // (opcional) se você mantiver inProcessDocs em memória e usar depois:
          // inProcessDocs = (inProcessDocs || []).filter(
          //   (d) => !personKeysToRemove.includes(d?.person?._key),
          // );

          activeTripId = String(created._key);
          renderTripForm();
          renderTripsBoard();
          alert("Viagem criada ✅");
        } catch (e) {
          console.error("Erro ao criar viagem no banco:", e);
          alert("Erro ao criar viagem.");
          syncCreateTripButtons();
        } finally {
          btnSubmit.disabled = false;
        }
      };
    }
  }

  function buildPatientCard(doc) {
    const inProcessKey = doc?.inProcessKey || null;
    const personKey = doc?.person?._key;
    const name = doc?.person?.name || "—";

    const next = getNextSched(doc);
    const serviceLabel =
      next?.serviceType?.nome || next?.serviceType?.name || "—";
    const dateLabel = fmtBR(next?.start?.date);

    const col = document.createElement("div");
    col.className = "col-12 mb-2";

    const card = document.createElement("div");
    card.className = "card paciente-card shadow-sm border";
    card.style.borderRadius = "12px";
    card.style.cursor = "pointer";
    card.style.background = "#fff";
    card.style.transition = "background-color .15s ease, box-shadow .15s ease";
    card.style.height = "64px";
    card.style.maxHeight = "64px";
    card.style.overflow = "hidden";

    card.dataset.key = personKey || "";
    card.dataset.name = name;

    card.innerHTML = `
      <div class="card-body p-2 d-flex align-items-center">
        <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
             style="width:34px;height:34px; flex:0 0 auto;">
          <i class="bi bi-person-fill"></i>
        </div>

        <div class="flex-grow-1 overflow-hidden" style="min-width:0;">
          <div class="fw-semibold text-truncate">${safeText(name)}</div>
          <div class="text-muted text-truncate" style="font-size:.8rem;">
            ${safeText(serviceLabel)} • ${safeText(dateLabel)}
          </div>
        </div>
      </div>
    `;

    function toggleSelect() {
      if (!personKey) return;

      const isSelected = selected.has(personKey);
      if (isSelected) {
        selected.delete(personKey);
        card.classList.remove("border-primary");
        card.style.backgroundColor = "#fff";
        card.style.boxShadow = "";
      } else {
        // ✅ AQUI É O FIX: guarda inProcessKey junto
        selected.set(personKey, {
          inProcessKey,
          person: doc.person,
          sched: next,
        });

        card.classList.add("border-primary");
        card.style.backgroundColor = "rgba(13,110,253,.06)";
        card.style.boxShadow = "0 0 0 2px rgba(13,110,253,.2)";
      }

      // debug rápido (se quiser ver na hora)
      // console.log("selected entries:", Array.from(selected.entries()));

      renderTripForm();
      syncCreateTripButtons();
    }

    card.addEventListener("click", toggleSelect);

    col.appendChild(card);
    return col;
  }

  (inProcessDocs || []).forEach((doc) => {
    if (!doc?.person?._key) return;
    if (gridPac) gridPac.appendChild(buildPatientCard(doc));
  });

  if (searchInp) {
    searchInp.oninput = () => {
      const term = (searchInp.value || "").toLowerCase();
      gridPac?.querySelectorAll?.(".paciente-card")?.forEach((card) => {
        const nm = (card.dataset.name || "").toLowerCase();
        const wrap = card.closest(".col-12");
        if (wrap) wrap.style.display = nm.includes(term) ? "" : "none";
      });
    };
  }

  renderTripForm();
  syncCreateTripButtons();
  await loadTripsFromDB();
  renderTripsBoard();
}

function bindTreeSelectionHandlers() {}

function enableTreeDetailsAnimations() {}

async function loadTripsFromDB() {
  console.log("ola");

  try {
    const unitKey = pickedServiceInfo?.unit?._key;
    if (!unitKey) return;

    const resp = await fetchData(
      `/transportPhase/travel/by-unit/${unitKey}`,
      "GET",
    );
    const travels = Array.isArray(resp?.travels) ? resp.travels : [];

    // zera e repopula mantendo a mesma referência do array trips
    trips.length = 0;

    travels.forEach((t) => {
      trips.push({
        id: String(t._key),
        name: t.name,
        driver: t.driver,
        destination: t.destination,
        tripDate: t.tripDate,
        vehicle: t.vehicle,
        status: t.status,
        mainService: t.mainService,
        persons: t.persons || [],
        createdAt: t.createdAt || 0,
        _id: t._id,
        _rev: t._rev,
      });
    });

    renderTripsBoard();
  } catch (e) {
    console.error("Erro ao carregar viagens:", e);
  }
}
