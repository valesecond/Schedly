async function showViewScheduling() {
  await loadUnitsTree();
  attachTreeHandlers();
}

let selectedServiceInfo = null;

let allUnits = [];
let currentUnits = []; // o que está renderizado no momento

async function loadUnitsTree() {
  const container = document.getElementById("unitsContainer");
  if (!container) {
    console.error("Container #unitsContainer não encontrado.");
    return;
  }

  try {
    allUnits = await fetchData("/attendanceUnit/search", "GET");
    currentUnits = [...allUnits];

    setupUnitsFilterUI(allUnits);

    renderUnitsTree(currentUnits);
  } catch (err) {
    console.error("Erro ao carregar unidades em árvore:", err);
    alert("Não foi possível carregar a árvore de unidades.");
  }
}

function setupUnitsFilterUI(units) {
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
  const apply = () => {
    const term = (inp.value || "").trim().toLowerCase();
    const city = (sel.value || "").trim().toUpperCase();

    const filtered = (allUnits || []).filter((unit) => {
      // 1) filtro de cidade
      if (city && (unit.city || "").trim().toUpperCase() !== city) {
        return false;
      }

      // 2) filtro por termo (nome OU city OU serviços/tipos/especialistas)
      if (!term) return true;

      const unitName = (unit.name || "").toLowerCase();
      const unitCity = (unit.city || "").toLowerCase();

      // Busca em serviços/tipos/especialistas (se existir)
      const servicesText = (unit.services || [])
        .map((svc) => {
          const svcName = svc?.name || "";
          const typeText = (svc?.types || [])
            .map((t) => {
              const tName = t?.nome || "";
              const spText = (t?.specialists || [])
                .map((sp) => sp?.name || "")
                .join(" ");
              return `${tName} ${spText}`;
            })
            .join(" ");
          return `${svcName} ${typeText}`;
        })
        .join(" ");

      const haystack = `${unitName} ${unitCity} ${servicesText}`.toLowerCase();
      return haystack.includes(term);
    });

    currentUnits = filtered;
    renderUnitsTree(currentUnits);
  };

  // debounce leve pra não renderizar a cada tecla muito rápido
  let t = null;
  inp.oninput = () => {
    clearTimeout(t);
    t = setTimeout(apply, 120);
  };

  sel.onchange = apply;

  btnClear.onclick = () => {
    inp.value = "";
    sel.value = "";
    apply();
    inp.focus();
  };

  // aplica logo pra setar contador
  apply();
}

function renderUnitsTree(units) {
  const container = document.getElementById("unitsContainer");
  if (!container) return;

  container.innerHTML = "";

  // contador
  const countEl = document.getElementById("unitsCount");
  if (countEl) countEl.textContent = String(units?.length || 0);

  (units || []).forEach((unit) => {
    const unitDetails = document.createElement("details");
    unitDetails.classList.add("unit-block");

    const unitSummary = document.createElement("summary");
    unitSummary.innerHTML = `
      <span>${unit.name} <small class="text-muted fw-normal">(${unit.city})</small></span>
      <i class="bi bi-chevron-down"></i>
    `;
    unitDetails.appendChild(unitSummary);

    const servicesContainer = document.createElement("ul");
    servicesContainer.classList.add("nested");

    (unit.services || []).forEach((svc) => {
      if (Array.isArray(svc.types) && svc.types.length) {
        const svcDetails = document.createElement("details");
        svcDetails.classList.add("service-block");

        const svcSummary = document.createElement("summary");
        svcSummary.innerHTML = `
          <span>${svc.name}</span>
          <i class="bi bi-chevron-down"></i>
        `;
        svcDetails.appendChild(svcSummary);

        const typesUl = document.createElement("ul");
        typesUl.classList.add("nested");

        svc.types.forEach((type) => {
          const typeDetails = document.createElement("details");
          typeDetails.classList.add("type-block");

          const typeSummary = document.createElement("summary");
          typeSummary.innerHTML = `
            <i class="bi bi-diagram-3-fill"></i>
            <span>${type.nome}</span>
          `;
          typeSummary.classList.add("d-flex", "align-items-center", "gap-2");
          typeDetails.appendChild(typeSummary);

          const specialistUl = document.createElement("ul");
          specialistUl.classList.add("nested", "specialist-list");

          if (Array.isArray(type.specialists) && type.specialists.length) {
            type.specialists.forEach((sp) => {
              const spLi = document.createElement("li");
              spLi.classList.add("specialist-item");

              spLi.innerHTML = `
                <i class="bi bi-person-badge-fill"></i>
                <span>${sp.name}</span>
              `;

              spLi.setAttribute("data-specialist", sp._key);

              spLi.addEventListener("click", async (e) => {
                e.stopPropagation();

                if (!unit._key || !type.key || !sp._key) {
                  alert(
                    "Dados do serviço incompletos. Não é possível reservar.",
                  );
                  console.error("Chave ausente:", { unit, type, sp });
                  return;
                }

                const selectedServiceInfo = {
                  unit: { _key: unit._key, name: unit.name },
                  service: svc.name,
                  serviceType: { _key: type.key, nome: type.nome },
                  specialist: { _key: sp._key, name: sp.name },
                };

                try {
                  const data = await fetchData(
                    `/promiseService/${unit._key}/${type.key}/${sp._key}`,
                    "GET",
                  );

                  if (data.available === undefined) {
                    alert("Resposta do servidor inválida. Consulte o console.");
                    console.error("Resposta inesperada:", data);
                    return;
                  }

                  if (data.available) {
                    // ✅ TEM VAGA: segue pro agendamento interno
                    window.selectedServiceInfo = selectedServiceInfo; // opcional (debug)
                    await sendSelectedService(selectedServiceInfo);
                  } else {
                    // ❌ SEM VAGA: vai pra reservado
                    sessionStorage.setItem(
                      "selectedServiceInfo",
                      JSON.stringify(selectedServiceInfo),
                    );
                    window.open("/scheduling/reserved", "_self");
                  }
                } catch (err) {
                  console.error("Erro ao verificar disponibilidade:", err);
                  alert("Erro ao verificar disponibilidade. Veja o console.");
                }
              });

              specialistUl.appendChild(spLi);
            });
          } else {
            const emptyLi = document.createElement("li");
            emptyLi.innerHTML = `
              <i class="bi bi-person-dash-fill"></i>
              <span class="text-muted">Reservar Vagas</span>
            `;
            emptyLi.classList.add("specialist-item", "text-muted");
            emptyLi.style.cursor = "pointer";

            emptyLi.addEventListener("click", async (e) => {
              e.stopPropagation();

              if (!unit._key || !type.key) {
                alert("Dados do serviço incompletos. Não é possível reservar.");
                console.error("Chave ausente:", { unit, type });
                return;
              }

              const selectedServiceInfo = {
                unit: { _key: unit._key, name: unit.name },
                service: { name: svc.name, _key: svc._key ?? svc.key },
                serviceType: { _key: type.key, nome: type.nome },
                specialist: null,
              };

              try {
                const data = await fetchData(
                  `/promiseService/${unit._key}/${type.key}`,
                  "GET",
                );

                if (data.available === undefined) {
                  alert("Resposta do servidor inválida. Veja o console.");
                  console.error("Resposta inesperada:", data);
                  return;
                }

                if (!data.available) {
                  sessionStorage.setItem(
                    "selectedServiceInfo",
                    JSON.stringify(selectedServiceInfo),
                  );
                  window.open("/scheduling/reserved", "_self");
                } else {
                  alert("Ainda há vagas disponíveis para este serviço.");
                }
              } catch (err) {
                console.error("Erro ao verificar disponibilidade:", err);
                alert("Erro ao verificar disponibilidade. Veja o console.");
              }
            });

            specialistUl.appendChild(emptyLi);
          }

          typeDetails.appendChild(specialistUl);
          typesUl.appendChild(typeDetails);
        });

        svcDetails.appendChild(typesUl);
        servicesContainer.appendChild(svcDetails);
      } else {
        const svcLi = document.createElement("li");
        svcLi.setAttribute("data-unit", unit._key);
        svcLi.setAttribute("data-service", svc.key);
        svcLi.textContent = svc.name;

        svcLi.addEventListener("click", () => {
          const selectedServiceInfo = {
            unit: { _key: unit._key, name: unit.name },
            service: { name: svc.name },
            serviceType: null,
          };
          sendSelectedService(selectedServiceInfo);
        });

        servicesContainer.appendChild(svcLi);
      }
    });

    unitDetails.appendChild(servicesContainer);
    container.appendChild(unitDetails);
  });

  setupDetailAnimations();
}

async function sendSelectedService(selectedServiceInfo) {
  if (!selectedServiceInfo) return;

  const userPropertyRaw = get_property_from_storage("user");

  const userProperty = {
    iat: userPropertyRaw.iat,
    _key: userPropertyRaw.sub,
    name: userPropertyRaw.person.name,
    person: userPropertyRaw.person,
    activeSession: userPropertyRaw.activeSession,
  };

  selectedServiceInfo.userProperty = userProperty;

  try {
    // 1) Faz PUT e obtém os dois arrays
    const { promiseServices, inProcessDocs } = await fetchData(
      "/service/promise",
      "PUT",
      selectedServiceInfo,
    );
    console.log("✅ Resposta do backend:", { promiseServices, inProcessDocs });

    // GUARDA para usar depois no PDF
    currentPromiseService = promiseServices[0];

    // 2) Renderiza a tela de agendamento
    renderSchedulingView(promiseServices, inProcessDocs, selectedServiceInfo);
  } catch (error) {
    console.error("❌ Erro ao enviar dados:", error);
    alert("Erro ao enviar os dados selecionados.");
  }
}

async function renderSchedulingView(
  promiseServices,
  inProcessDocs,
  selectedServiceInfo,
) {
  const gridPac = document.getElementById("gridPacientes");

  function getRemaining(btn) {
    return Number(
      btn.dataset.vacancyRemaining ?? btn.dataset.vacancyLimit ?? 0,
    );
  }

  function setRemaining(btn, value) {
    btn.dataset.vacancyRemaining = String(value);
    setBtnState(btn);
  }

  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  function isDatePast(fullDate) {
    if (!fullDate) return false;
    const d = new Date(fullDate + "T00:00");
    d.setHours(0, 0, 0, 0);
    return d < today;
  }

  function setBtnState(btn) {
    if (!btn) return;
    const isPast = isDatePast(btn.dataset.date);
    const remaining = Number(
      btn.dataset.vacancyRemaining ?? btn.dataset.vacancyLimit ?? 0,
    );
    const isFull = remaining <= 0;

    btn.disabled = !!(isPast || isFull);
    btn.setAttribute("aria-disabled", btn.disabled ? "true" : "false");

    // Limpar HTML de badge existente antes de recriar
    const oldBadge = btn.querySelector(".badge");
    if (oldBadge) oldBadge.remove();

    // limpar classes do botão
    btn.classList.remove(
      "btn-outline-success",
      "btn-secondary",
      "full",
      "disabled",
    );

    // Criar badge dinamicamente
    const badge = document.createElement("span");
    badge.classList.add("badge");

    if (isPast) {
      badge.classList.add("bg-danger");
      badge.textContent = "DATA PASSADA";
      btn.classList.add("btn-outline-danger", "disabled");
      btn.title = "Data passada — não disponível";
      btn.style.opacity = "1";
    } else if (isFull) {
      badge.classList.add("bg-danger");
      badge.textContent = "SEM VAGAS";
      btn.classList.add("btn-outline-danger", "full", "disabled");
      btn.title = "Sem vagas";
      btn.style.opacity = "1";
    } else {
      badge.classList.add("bg-success");
      badge.textContent = `${remaining} VAGAS`; // <-- aqui com a palavra
      btn.classList.add("btn-outline-success");
      btn.title = "";
      btn.style.opacity = "1";
    }

    // Adicionar badge no botão
    btn.appendChild(badge);
  }

  const listaDias = document.getElementById("listaDias");
  const colAg = document.getElementById("colAgendados");
  const gridAg = document.getElementById("gridAgendados");
  const lblDate = document.getElementById("activeDateLabel");
  const searchInp = document.getElementById("searchPaciente");

  const ps = promiseServices[0] || {
    _key: null,
    scheduledDays: [],
    period: null,
  };
  const assignments = {};
  let activeDate = null;
  const selectedPatients = new Set();
  const docMap = new Map();

  function createPacienteCard(doc) {
    const key = doc.person._key;
    const name = doc.person.name;
    const { conduct = "elective", priorityGroup = [] } = doc.requestPhase || {};
    const isReserved = doc.isReserved || false; // <-- pegar a flag

    const borderClass =
      conduct === "emergency"
        ? "border-danger"
        : conduct === "urgency"
          ? "border-warning"
          : "border-success";

    const bgColorMap = {
      emergency: "rgba(220,53,69,0.2)",
      urgency: "rgba(255,193,7,0.2)",
      elective: "rgba(40,167,69,0.2)",
    };

    const col = document.createElement("div");
    col.className = "col-12 mb-2";

    const card = document.createElement("div");
    card.className = `card paciente-card shadow-sm text-center ${borderClass}`;
    card.style.backgroundColor = "white";
    card.style.transition =
      "transform 0.2s, box-shadow 0.2s, background-color 0.2s";
    card.style.maxHeight = "160px";
    card.style.overflow = "hidden";
    card.dataset.key = key;
    card.dataset.name = name;

    const reservedBadgeHtml = isReserved
      ? `<span class="badge bg-warning text-dark me-1" style="font-size:.7rem;">RESERVADO</span>`
      : "";

    const priorityMap = {
      elderly: "Idoso",
      superelderly: "Super Idoso",
      pregnant: "Gestante",
      disabilities: "Deficiente",
    };
    const badgesHtml = (priorityGroup || [])
      .map((pg) => {
        const label = priorityMap[pg] || pg;
        return `<span class="badge bg-primary me-1 text-uppercase" style="font-size:.7rem;">${label}</span>`;
      })
      .join("");

    card.innerHTML = `
    <div class="card-body d-flex flex-column align-items-center p-3 rounded-bottom">
      <div class="avatar bg-primary rounded-circle mb-3 d-flex justify-content-center align-items-center" style="width:50px; height:50px;">
        <i class="bi bi-person-fill text-white fs-4"></i>
      </div>
      <h6 class="card-title mb-2 text-truncate fw-bold">${name}</h6>
      <div class="d-flex flex-wrap justify-content-center">${reservedBadgeHtml}${badgesHtml}</div>
    </div>
  `;

    card.addEventListener(
      "mouseover",
      () => (card.style.transform = "scale(1.02)"),
    );
    card.addEventListener(
      "mouseout",
      () => (card.style.transform = "scale(1)"),
    );

    card.addEventListener("click", () => {
      const isSelected = selectedPatients.has(key);
      if (isSelected) {
        selectedPatients.delete(key);
        card.style.backgroundColor = "white";
      } else {
        selectedPatients.add(key);
        card.style.backgroundColor = bgColorMap[conduct] || "white";
      }
    });

    col.appendChild(card);
    return col;
  }

  function attachReturnHandler(cardEl, fullDate, key) {
    cardEl.querySelector(".btn-return").addEventListener("click", async () => {
      console.log(
        `[RETURN] Iniciando retorno do paciente ${key} na data ${fullDate}`,
      );
      const r = await fetchData("/service/promise/item/return", "PUT", {
        promiseService: { _key: ps._key },
        person: { _key: key },
      });
      console.log("[RETURN] Resposta do backend:", r);

      if (!r.success) {
        console.error(`[RETURN] Falha ao retornar paciente ${key}`);
        return;
      }

      assignments[fullDate] = assignments[fullDate].filter(
        (a) => a.key !== key,
      );
      console.log(
        `[RETURN] assignments[${fullDate}] após remoção:`,
        assignments[fullDate],
      );
      renderAgendados(fullDate);

      const dayBtn = listaDias.querySelector(`button[data-date="${fullDate}"]`);
      const cur = getRemaining(dayBtn);
      setRemaining(dayBtn, cur + 1);
      dayBtn.classList.remove("full");

      // 3) Devolve ao grid de pacientes
      const name = cardEl.querySelector(".card-body h6").textContent;
      const doc = docMap.get(key);
      if (doc) {
        gridPac.appendChild(createPacienteCard(doc));
      }
      console.log(
        `[RETURN] Paciente ${key} (${name}) reinserido em gridPacientes`,
      );
    });
  }

  function attachDeleteHandler(cardEl, fullDate, key) {
    const btn = cardEl.querySelector(".btn-delete");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      console.log(
        `[DELETE] Iniciando exclusão do paciente ${key} na data ${fullDate}`,
      );

      const userPropertyRaw = get_property_from_storage("user");
      const userProperty = {
        iat: userPropertyRaw.iat,
        _key: userPropertyRaw.sub,
        name: userPropertyRaw.person?.name || userPropertyRaw.name,
        person: userPropertyRaw.person,
        activeSession: userPropertyRaw.activeSession,
      };

      const r = await fetchData("/service/promise/item/delete", "PUT", {
        userProperty,
        promiseService: { _key: ps._key },
        person: { _key: key },
      });
      console.log("[DELETE] Resposta do backend:", r);

      if (!r.success) {
        console.error(`[DELETE] Falha ao excluir paciente ${key}`);
        return;
      }

      assignments[fullDate] = (assignments[fullDate] || []).filter(
        (a) => a.key !== key,
      );
      renderAgendados(fullDate);

      const dayBtn = listaDias.querySelector(`button[data-date="${fullDate}"]`);
      if (dayBtn) {
        const cur = getRemaining(dayBtn);
        const newVal = cur + 1;
        setRemaining(dayBtn, newVal);
        dayBtn.classList.remove("full");
      }

      console.log(`[DELETE] Paciente ${key} excluído e vagas atualizadas`);
    });
  }

  // -----------------------
  // Render Agendados (function declaration hoisted)
  // -----------------------
  function renderAgendados(fullDate) {
    gridAg.innerHTML = "";
    const list = assignments[fullDate] || [];
    list.forEach(({ key, name }) => {
      const col = document.createElement("div");
      col.className = "col-12 mb-2";

      const cardEl = document.createElement("div");
      cardEl.className =
        "card agendado-card border-primary shadow-sm d-flex flex-column h-100";
      cardEl.innerHTML = `
        <div class="card-body d-flex align-items-center p-3">
          <div class="avatar bg-primary rounded-circle me-3 d-flex justify-content-center align-items-center">
            <i class="bi bi-check-circle-fill text-white"></i>
          </div>
          <h6 class="card-title mb-0 text-truncate">${name}</h6>
        </div>
        <div class="card-footer bg-transparent border-0 d-flex justify-content-between px-3 p-2">
          <button class="btn btn-sm btn-outline-primary btn-return" title="Desagendar"><i class="bi bi-arrow-counterclockwise"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-delete" title="Excluir"><i class="bi bi-trash-fill"></i></button>
        </div>
      `;
      col.appendChild(cardEl);
      gridAg.appendChild(col);

      attachReturnHandler(cardEl, fullDate, key);
      attachDeleteHandler(cardEl, fullDate, key);
    });
  }

  document.getElementById("unitsContainer").style.display = "none";
  document.getElementById("unitsFilterCard").style.display = "none";
  const sc = document.getElementById("schedulingContainer");
  sc.style.display = "block";

  gridPac.innerHTML = "";
  listaDias.innerHTML = "";
  gridAg.innerHTML = "";
  lblDate.textContent = "–";
  colAg.style.display = "none";

  // Header estilizado (especialista + serviço + filtro)
  const existingHeader = document.getElementById("schedulingHeader");
  if (existingHeader) existingHeader.remove();
  const header = document.createElement("div");
  header.id = "schedulingHeader";
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.margin = "0 auto 1rem";
  header.style.alignItems = "center";
  header.style.maxWidth = "400px";
  header.style.padding = "0.8rem 1rem";
  header.style.alignSelf = "center";
  header.style.marginBottom = "1rem";
  header.style.background = "#ffffff";
  header.style.borderRadius = "0.5rem";
  header.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
  header.innerHTML = `
    <div style="font-size:1.35rem; font-weight:700; color:#0d6efd; text-align:center; margin-bottom:0.7rem;">
      ${selectedServiceInfo?.specialist?.name || "–"}
    </div>
    <div style="font-size:0.875rem; font-weight:500; color:#6c757d; text-align:center; margin-bottom:0.7rem;">
      ${selectedServiceInfo?.serviceType?.nome || "–"}
    </div>
    <div id="periodFilter" style="display:flex; gap:0.5rem;">
      <button type="button" class="btn btn-sm btn-outline-primary rounded-pill" data-period="MANHA">Manhã</button>
      <button type="button" class="btn btn-sm btn-outline-primary rounded-pill" data-period="TARDE">Tarde</button>
      <button type="button" class="btn btn-sm btn-outline-primary rounded-pill" data-period="NOITE">Noite</button>
    </div>
  `;
  sc.prepend(header);

  // padrão Manhã ativo
  let currentPeriod = "MANHA";
  const btns = header.querySelectorAll("#periodFilter button");
  btns.forEach((btn) => {
    if (btn.dataset.period === currentPeriod) {
      btn.classList.replace("btn-outline-primary", "btn-primary");
    }
    btn.addEventListener("click", () => {
      btns.forEach((b) =>
        b.classList.replace("btn-primary", "btn-outline-primary"),
      );
      btn.classList.replace("btn-outline-primary", "btn-primary");
      currentPeriod = btn.dataset.period;
      applyPeriodFilter();
    });
  });

  // 5) popula grid de pacientes iniciais (e docMap)
  inProcessDocs.forEach((doc) => {
    docMap.set(doc.person._key, doc);
    gridPac.appendChild(createPacienteCard(doc));
  });

  // 6) filtro de nome
  searchInp.addEventListener("input", () => {
    const term = searchInp.value.toLowerCase();
    gridPac.querySelectorAll(".paciente-card").forEach((card) => {
      card.closest(".col-12").style.display = card.dataset.name
        .toLowerCase()
        .includes(term)
        ? ""
        : "none";
    });
  });

  // 7) popula dias e agendamentos
  ps.scheduledDays.forEach((item) => {
    const fullDate = item.date?.date;
    const period = item.date?.period || "";
    const vacancyLimit = Number(item.vacancyLimit ?? 0);
    if (!fullDate) return;
    assignments[fullDate] = [];

    const col = document.createElement("div");
    col.className = "col-6 mb-2";
    col.dataset.period = period.toUpperCase();

    const btn = document.createElement("button");
    btn.className = "btn btn-outline-success btn-dia shadow-sm w-100";
    btn.dataset.date = fullDate;
    btn.dataset.vacancyLimit = vacancyLimit;
    btn.innerHTML = `
      <div class="fw-semibold mb-1">${new Date(
        fullDate + "T00:00",
      ).toLocaleDateString("pt-BR")}</div>
    `;

    const isPast = isDatePast(fullDate);
    const isFull = vacancyLimit <= 0;
    setBtnState(btn, { isPast, isFull });

    btn.addEventListener("click", async () => {
      if (btn.disabled) {
        console.warn("[SCHEDULING] tentativa em data bloqueada:", fullDate);
        return;
      }

      activeDate = fullDate;
      window.fullDate = fullDate;
      lblDate.textContent = new Date(fullDate + "T00:00").toLocaleDateString(
        "pt-BR",
      );
      colAg.style.display = "block";

      // 7.1) Fetch agendados existentes
      const resp = await fetchData("/service/scheduled/search", "put", {
        promiseService: { _key: ps._key },
        date: fullDate,
        serviceType: selectedServiceInfo.serviceType,
      });
      assignments[fullDate] =
        resp.success && Array.isArray(resp.data)
          ? resp.data.map((i) => ({ key: i.person._key, name: i.person.name }))
          : [];

      renderAgendados(fullDate);

      // 7.2) Preparar array de pacientes a agendar
      const toSchedule = Array.from(selectedPatients).map((personKey) => {
        const cardEl = gridPac.querySelector(
          `.paciente-card[data-key="${personKey}"]`,
        );
        return { _key: personKey, name: cardEl?.dataset?.name || "" };
      });
      if (toSchedule.length === 0) return;

      const userPropertyRaw = get_property_from_storage("user");
      const userProperty = {
        iat: userPropertyRaw.iat,
        _key: userPropertyRaw.sub,
        name: userPropertyRaw.name,
        person: userPropertyRaw.person,
        activeSession: userPropertyRaw.activeSession,
      };
      const attendanceUnit = {
        _key: selectedServiceInfo.unit._key,
        name: selectedServiceInfo.unit.name,
      };

      // 7.3) Chama endpoint em lote
      const batchResp = await fetchData("/service/promise/items", "PUT", {
        promiseService: { _key: ps._key },
        userProperty,
        attendanceUnit,
        serviceType: selectedServiceInfo.serviceType,
        specialist: selectedServiceInfo.specialist,
        persons: toSchedule,
        start: { date: fullDate, period },
        status: "PENDENTE",
        timestamp: new Date().toISOString(),
      });

      if (!batchResp.success) {
        console.error("Erro no agendamento em lote:", batchResp.error);
        return;
      }

      // 7.4) Atualiza assignments e remove cards do grid
      toSchedule.forEach(({ _key, name }) => {
        assignments[fullDate].push({ key: _key, name });
        const card = gridPac.querySelector(
          `.paciente-card[data-key="${_key}"]`,
        );
        card?.closest(".col-12")?.remove();
      });
      selectedPatients.clear();

      // 7.5) Decrementa badge de vagas de acordo com o scheduledCount
      const dec = Number(batchResp.scheduledCount ?? toSchedule.length ?? 0);
      const current = getRemaining(btn);
      const newCount = Math.max(current - dec, 0);

      setRemaining(btn, newCount);
      if (newCount === 0) btn.classList.add("full");

      // 7.6) Renderiza lista de agendados
      renderAgendados(fullDate);
    });

    col.appendChild(btn);
    listaDias.appendChild(col);
  });

  // 8) filtro de período
  function applyPeriodFilter() {
    listaDias.querySelectorAll(".col-6").forEach((col) => {
      col.style.display =
        col.dataset.period.toLowerCase() === currentPeriod.toLowerCase()
          ? ""
          : "none";
    });
  }

  applyPeriodFilter();
}

async function generateServicePDF() {
  // Verifica se existe promiseService configurado
  if (!currentPromiseService?._key) {
    console.error("promiseService não inicializado!");
    return;
  }

  // Recupera os dados do usuário
  const userPropertyRaw = get_property_from_storage("user");
  const userProperty = {
    iat: userPropertyRaw.iat,
    _key: userPropertyRaw.sub,
    name: userPropertyRaw.person.name,
    person: userPropertyRaw.person,
    activeSession: userPropertyRaw.activeSession,
  };

  // Monta payload para o PUT
  const payload = {
    userProperty,
    attendanceUnit: {
      _key: selectedServiceInfo.unit._key,
      name: selectedServiceInfo.unit.name,
    },
    serviceType: {
      _key: selectedServiceInfo.serviceType._key,
      nome: selectedServiceInfo.serviceType.nome,
    },
    promiseService: { _key: currentPromiseService._key },
  };

  try {
    const { pdfBase64 } = await fetchData(
      "/schedulingPhase/pdf",
      "PUT",
      payload,
    );

    if (!pdfBase64) {
      console.error("Resposta inválida, sem pdfBase64.");
      return;
    }

    const byteChars = atob(pdfBase64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: "application/pdf" });

    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
  }
}

async function generateDayPDF() {
  dayDate = window.fullDate;

  const userPropertyRaw = get_property_from_storage("user");
  const userProperty = {
    iat: userPropertyRaw.iat,
    _key: userPropertyRaw.sub,
    name: userPropertyRaw.person.name,
    person: userPropertyRaw.person,
    activeSession: userPropertyRaw.activeSession,
  };

  const payload = {
    userProperty,
    attendanceUnit: {
      _key: selectedServiceInfo.unit._key,
      name: selectedServiceInfo.unit.name,
    },
    serviceType: {
      _key: selectedServiceInfo.serviceType._key,
      nome: selectedServiceInfo.serviceType.nome,
    },
    promiseService: { _key: currentPromiseService._key },
    date: dayDate,
  };

  console.log("payload:", payload);

  try {
    const { pdfBase64 } = await fetchData(
      "/schedulingPhase/day/pdf",
      "PUT",
      payload,
    );

    if (!pdfBase64) {
      console.error("Resposta inválida, sem pdfBase64.");
      return;
    }

    // Decodifica e abre o PDF
    const byteChars = atob(pdfBase64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  } catch (err) {
    console.error("Erro ao gerar PDF do dia:", err);
  }
}

async function generatePDFPatient() {
  if (!currentPromiseService?._key) {
    console.error("promiseService não inicializado!");
    return;
  }

  const userPropertyRaw = get_property_from_storage("user");

  const userProperty = {
    iat: userPropertyRaw.iat,
    _key: userPropertyRaw.sub,
    name: userPropertyRaw.person.name,
    person: userPropertyRaw.person,
    activeSession: userPropertyRaw.activeSession,
  };

  const payload = {
    userProperty,
    attendanceUnit: {
      _key: selectedServiceInfo.unit._key,
      name: selectedServiceInfo.unit.name,
    },
    serviceType: {
      _key: selectedServiceInfo.serviceType._key,
      nome: selectedServiceInfo.serviceType.nome,
    },
    promiseService: { _key: currentPromiseService._key },
  };

  console.log("payload:", payload);

  try {
    const { pdfBase64 } = await fetchData(
      "/schedulingPhase/pdf/patient",
      "PUT",
      payload,
    );

    if (!pdfBase64) {
      console.error("Resposta inválida, sem pdfBase64.");
      return;
    }

    const byteChars = atob(pdfBase64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: "application/pdf" });

    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  } catch (err) {
    console.error(
      "Erro ao gerar PDF da lista de pacientes aguardando agendamento:",
      err,
    );
  }
}

async function generatePDFGeneral() {
  if (!currentPromiseService?._key) {
    console.error("promiseService não inicializado!");
    return;
  }

  dayDate = window.fullDate;

  const userPropertyRaw = get_property_from_storage("user");
  const userProperty = {
    iat: userPropertyRaw.iat,
    _key: userPropertyRaw.sub,
    name: userPropertyRaw.person.name,
    person: userPropertyRaw.person,
    activeSession: userPropertyRaw.activeSession,
  };

  const payload = {
    userProperty,
    attendanceUnit: {
      _key: selectedServiceInfo.unit._key,
      name: selectedServiceInfo.unit.name,
    },
    serviceType: {
      _key: selectedServiceInfo.serviceType._key,
      nome: selectedServiceInfo.serviceType.nome,
    },
    promiseService: { _key: currentPromiseService._key },
    date: dayDate,
  };

  try {
    const { pdfBase64 } = await fetchData(
      "/schedulingPhase/pdf/general",
      "PUT",
      payload,
    );

    if (!pdfBase64) {
      console.error("Resposta inválida, sem pdfBase64.");
      return;
    }

    const byteChars = atob(pdfBase64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: "application/pdf" });

    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  } catch (err) {
    console.error("Erro ao gerar PDF geral:", err);
  }
}

function attachTreeHandlers() {
  document.querySelectorAll(".tree .nested li[data-unit]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      document
        .querySelectorAll(".tree .nested li.active")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      document.getElementById("btnConfirm").disabled = false;
      window.selected = {
        unit: item.dataset.unit,
        service: item.dataset.service,
      };
    });
  });
}

function setupDetailAnimations() {
  document.querySelectorAll(".tree details").forEach((details) => {
    const summary = details.querySelector("summary");
    const content = details.querySelector("ul");
    if (!summary || !content) return;

    // Estado inicial: oculto ou visível
    content.style.overflow = "hidden";
    content.style.transformOrigin = "top";
    content.style.transform = details.open ? "scaleY(1)" : "scaleY(0)";

    summary.addEventListener("click", (e) => {
      e.preventDefault();

      if (details.open) {
        // — FECHAR —
        const anim = content.animate(
          [{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }],
          { duration: 400, easing: "ease" },
        );
        anim.onfinish = () => {
          details.open = false;
          content.style.transform = "scaleY(0)";
        };
      } else {
        details.open = true;
        content.style.transform = "scaleY(0)";
        const anim = content.animate(
          [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
          { duration: 600, easing: "ease" },
        );
        anim.onfinish = () => {
          content.style.transform = "scaleY(1)";
        };
      }
    });
  });
}
