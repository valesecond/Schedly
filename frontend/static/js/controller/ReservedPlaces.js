async function showViewReserved() {
  await loadReservedFromSession();
  await carregarReservados();
}

async function enviarParaFila(listaIds) {
  if (!listaIds || listaIds.length === 0)
    return alert("Nenhum item selecionado.");

  let selectedServiceInfo = null;
  const raw = sessionStorage.getItem("selectedServiceInfo");
  if (raw) {
    try {
      selectedServiceInfo = JSON.parse(raw);
    } catch {}
  }

  const body = {
    ids: listaIds,
    serviceInfo: selectedServiceInfo,
  };

  try {
    const response = await fetchData("/reserved", "PUT", body);
    if (response.error) throw new Error(response.error);

    alert("Itens enviados para fila com sucesso!");

    listaIds.forEach((item) => {
      const card = document.querySelector(
        `.paciente-card[data-key="${item.id}"]`
      );
      if (card && card.parentNode) {
        const col = card.parentNode; // o div.paciente-col
        col.parentNode.removeChild(col);
      }
    });

    await carregarReservados();
  } catch (err) {
    console.error(err);
    alert("Erro ao enviar os itens para fila. Tente novamente.");
  }
}

function criarBotoesEnviar() {
  // tenta encontrar container; se não existir, cria dinamicamente e posiciona
  let container = document.getElementById("btnFunction");
  const gridPac = document.getElementById("gridPacientes");

  if (!container) {
    if (gridPac && gridPac.parentNode) {
      container = document.createElement("div");
      container.id = "btnFunction";
      container.style.display = "flex";
      container.style.gap = "0.5rem";
      container.style.marginTop = "0.5rem";
      container.style.width = "100%";
      container.style.justifyContent = "center";
      gridPac.parentNode.insertBefore(container, gridPac.nextSibling);
    } else {
      const reservedContainer = document.getElementById("reservedContainer");
      if (reservedContainer) {
        container = document.createElement("div");
        container.id = "btnFunction";
        container.style.display = "flex";
        container.style.gap = "0.5rem";
        container.style.marginTop = "0.5rem";
        container.style.width = "100%";
        container.style.justifyContent = "center";
        reservedContainer.appendChild(container);
      } else {
        container = document.createElement("div");
        container.id = "btnFunction";
        container.style.display = "flex";
        container.style.gap = "0.5rem";
        container.style.marginTop = "0.5rem";
        container.style.width = "100%";
        container.style.justifyContent = "center";
        document.body.appendChild(container);
      }
    }
  }

  // limpa e cria botões
  container.innerHTML = "";

  const btnSelecionados = document.createElement("button");
  btnSelecionados.className = "btn btn-primary";
  btnSelecionados.style.minWidth = "160px";
  btnSelecionados.textContent = "Enviar selecionados para fila";
  btnSelecionados.disabled = true;

  btnSelecionados.addEventListener("click", () => {
    const selecionados = [
      ...document.querySelectorAll(".paciente-card.selected"),
    ].map((card) => ({
      id: card.dataset.key,
      name: card.dataset.name,
    }));
    if (selecionados.length === 0) {
      alert("Nenhum item selecionado.");
      return;
    }
    enviarParaFila(selecionados);
  });

  const btnTodos = document.createElement("button");
  btnTodos.className = "btn btn-outline";
  btnTodos.style.minWidth = "140px";
  btnTodos.style.marginLeft = "8px";
  btnTodos.textContent = "Enviar todos para fila";

  btnTodos.addEventListener("click", () => {
    const todos = [...document.querySelectorAll(".paciente-card")].map(
      (card) => ({
        id: card.dataset.key,
        name: card.dataset.name,
      })
    );
    if (todos.length === 0) {
      alert("Nenhum paciente para enviar.");
      return;
    }
    enviarParaFila(todos);
  });

  container.appendChild(btnSelecionados);
  container.appendChild(btnTodos);

  // Atualiza estado do botão "Selecionados"
  function updateSelecionadosState() {
    const anySelected = document.querySelectorAll(
      ".paciente-card.selected"
    ).length;
    btnSelecionados.disabled = !anySelected;
  }

  gridPac.addEventListener("click", (ev) => {
    const docsBtn = ev.target.closest(".abrir-docs");

    if (docsBtn) {
      ev.stopPropagation();
      abrirDocumentosPessoa(docsBtn.dataset.person_key);
      return;
    }

    // AQUI É O CLIQUE NORMAL DO CARD → SELECIONAR
    const card = ev.target.closest(".paciente-card");
    if (card) {
      card.classList.toggle("selected");
    }
  });

  // Observer para mudanças na lista (cards adicionados/removidos)
  if (!container._observer) {
    const obsTarget = gridPac || document.body;
    const obs = new MutationObserver(() => {
      updateSelecionadosState();
    });
    obs.observe(obsTarget, { childList: true, subtree: true });
    container._observer = obs;
  }

  // estado inicial
  updateSelecionadosState();

  // debug rápido — remova se quiser
  console.log("btnFunction container:", container);
}

async function abrirDocumentosPessoa(person_key) {
  console.log(person_key);

  const container = document.getElementById("documentosPessoaContainer");
  container.innerHTML = `<div class="loading">Carregando documentos...</div>`;

  try {
    const dados = await fetchData("/person/docs", "PUT", { person_key });
    console.log("dados", dados);

    if (!dados || !dados.l_docs || dados.l_docs.length === 0) {
      container.innerHTML = `
        <div class="docs-card">
          <h3 class="docs-title">Documentos da Pessoa</h3>
          <p class="docs-empty">Nenhum documento anexado.</p>
        </div>`;
      return;
    }

    let html = `
      <div class="docs-card">
        <h3 class="docs-title">Documentos de ${dados.name}</h3>
        <div class="docs-grid">
    `;

    dados.l_docs.forEach((doc) => {
      html += `
        <button class="doc-item" onclick="abrirArquivo('${doc.url}')">
          <div class="doc-icon">📄</div>
          <div class="doc-name">${doc.filename}</div>
        </button>`;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="docs-card error">Erro ao carregar documentos.</div>`;
  }
}

function abrirArquivo(url) {
  window.open(url, "_blank");
}

async function loadReservedFromSession() {
  const raw = sessionStorage.getItem("selectedServiceInfo");
  if (!raw) {
    console.warn("selectedServiceInfo não encontrado na sessionStorage.");
    return;
  }

  let selected;
  try {
    selected = JSON.parse(raw);
  } catch (err) {
    console.error("Falha ao parsear selectedServiceInfo:", err);
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

  selected.userProperty = userProperty;

  console.log("selectedServiceInfo:", selected);

  const headerLabel = document.getElementById("activeDateLabel");
  if (headerLabel && selected?.serviceType?.nome) {
    headerLabel.textContent = selected.serviceType.nome.toUpperCase();
  }

  const resp = await fetchData("/reserved/listReserved", "PUT", selected);
  console.log("Resposta da rota:", resp);

  // --------- Normaliza resposta ----------
  const promiseServices = resp?.promiseServices || resp?.promiseService || [];
  let inProcessDocs = [];

  if (Array.isArray(resp)) {
    inProcessDocs = resp;
  } else if (Array.isArray(resp.reserved)) {
    inProcessDocs = resp.reserved;
  } else if (Array.isArray(resp.inProcessDocs)) {
    inProcessDocs = resp.inProcessDocs;
  } else if (Array.isArray(resp.data)) {
    inProcessDocs = resp.data;
  } else {
    inProcessDocs = [];
  }

  // --------- Render pacientes (lista principal) ----------
  const gridPac = document.getElementById("gridPacientes");
  if (!gridPac) {
    console.warn("Elemento #gridPacientes não encontrado.");
  } else {
    gridPac.innerHTML = "";
    inProcessDocs.forEach((doc) => {
      const col = document.createElement("div");
      col.className = "paciente-col";
      const card = document.createElement("div");
      card.className = "paciente-card";
      card.dataset.key = doc.person?._key || "";
      card.dataset.name = doc.person?.name || "";

      card.innerHTML = `
  <div class="avatar"><i class="bi bi-person-fill"></i></div>

  <div class="title abrir-docs"
       data-person_key="${doc.person?._key}">
       ${doc.person?.name || "—"}
  </div>
`;

      // ** NÃO adicionamos listener em cada card aqui **
      // selection será tratada por delegation dentro de criarBotoesEnviar()

      col.appendChild(card);
      gridPac.appendChild(col);
    });
  }

  // --------- Obter scheduledDays (mantive sua lógica) ----------
  const promiseServicesFirst =
    (Array.isArray(promiseServices) && promiseServices[0]) ||
    promiseServices ||
    null;
  let scheduledDays = promiseServicesFirst?.scheduledDays || [];

  if (!scheduledDays || !scheduledDays.length) {
    const group = {};
    inProcessDocs.forEach((r) => {
      const phases = Array.isArray(r.schedulingPhase) ? r.schedulingPhase : [];
      phases.forEach((p) => {
        const startDate = p?.start?.date || null;
        let periodRaw = p?.start?.period || p?.start?.periodo || "";
        if (!startDate) return;
        const pr = String(periodRaw).toLowerCase();
        let period = "MANHÃ";
        if (pr.includes("manha") || pr.includes("manhã")) period = "MANHÃ";
        else if (pr.includes("tarde")) period = "TARDE";
        else if (pr.includes("noite")) period = "NOITE";
        else if (p?.start?.period)
          period = String(p.start.period).toUpperCase();
        const key = `${startDate}|${period}`;
        if (!group[key]) group[key] = { date: startDate, period, count: 0 };
        group[key].count += 1;
      });
    });

    if (Object.keys(group).length === 0) {
      inProcessDocs.forEach((r) => {
        const tsCandidates = [
          r.schedulingPhase &&
            Array.isArray(r.schedulingPhase) &&
            r.schedulingPhase[0] &&
            r.schedulingPhase[0].timestamp &&
            r.schedulingPhase[0].timestamp.datetime,
          r.requestPhase?.timestamp?.datetime,
          r.person?.timestamp?.datetime,
          r.timestamp?.datetime,
        ];
        let ts = tsCandidates.find(Boolean) || null;
        let dateISO = null;
        let hour = null;
        if (ts) {
          try {
            const d = new Date(ts);
            if (!isNaN(d)) {
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              dateISO = `${yyyy}-${mm}-${dd}`;
              hour = d.getHours();
            }
          } catch (e) {}
        }
        if (!dateISO && r.requestPhase?.timestamp?.date) {
          const parts = String(r.requestPhase.timestamp.date).split("/");
          if (parts.length === 3) {
            const dd = parts[0].padStart(2, "0");
            const mm = parts[1].padStart(2, "0");
            const yyyy = parts[2];
            dateISO = `${yyyy}-${mm}-${dd}`;
          }
        }
        if (!dateISO) return;
        if (hour === null && r.requestPhase?.timestamp?.time) {
          const tparts = String(r.requestPhase.timestamp.time).split(":");
          if (tparts.length) hour = parseInt(tparts[0], 10);
        }
        let period = "MANHÃ";
        if (hour === null || isNaN(hour)) period = "MANHÃ";
        else if (hour >= 0 && hour < 12) period = "MANHÃ";
        else if (hour >= 12 && hour < 18) period = "TARDE";
        else period = "NOITE";
        const key = `${dateISO}|${period}`;
        if (!group[key]) group[key] = { date: dateISO, period, count: 0 };
        group[key].count += 1;
      });
    }

    scheduledDays = Object.values(group).map((g) => ({
      date: { date: g.date, period: g.period },
      vacancyLimit: g.count,
    }));

    scheduledDays.sort((a, b) => (a.date.date > b.date.date ? 1 : -1));
  }

  // Exibe/oculta aviso de sem agenda
  const noSchedule = document.querySelector("#reservedContainer .no-schedule");
  if (!scheduledDays.length) {
    if (noSchedule) noSchedule.style.display = "flex";
  } else {
    if (noSchedule) noSchedule.style.display = "none";
  }

  // Limpa e popula days container (se existir)
  const daysContainer = document.getElementById("reservedDaysContainer");
  if (daysContainer) daysContainer.innerHTML = "";

  scheduledDays.forEach((item) => {
    const fullDate = item.date?.date;
    const period = (item.date?.period || "").toUpperCase();
    const vacancyLimit = item.vacancyLimit ?? 0;
    if (!fullDate) return;

    const wrapper = document.createElement("div");
    const btn = document.createElement("button");
    btn.className = "btn-dia";
    btn.dataset.date = fullDate;
    btn.dataset.period = period;
    btn.dataset.vacancylimit = vacancyLimit;
    const used = 0;
    const left = Math.max(vacancyLimit - used, 0);

    btn.innerHTML = `
      <div class="date">${new Date(fullDate + "T00:00").toLocaleDateString(
        "pt-BR"
      )} <small>(${period.toLowerCase()})</small></div>
      <div class="meta"><span class='badge bg-success'>${left}</span> vagas</div>
    `;

    btn.addEventListener("click", async () => {
      document.getElementById("activeDateLabel").textContent =
        new Date(fullDate + "T00:00").toLocaleDateString("pt-BR") +
        " " +
        period;

      try {
        const scheduledResp = await fetchData(
          "/service/scheduled/search",
          "PUT",
          {
            promiseService: {
              _key:
                promiseServicesFirst?._key || promiseServicesFirst?._id || null,
            },
            date: fullDate,
            serviceType:
              selected.serviceType || selected.service?.serviceType || null,
          }
        );
        const list =
          (scheduledResp && Array.isArray(scheduledResp.data)
            ? scheduledResp.data
            : scheduledResp) || [];
        renderReservados(list);
      } catch (err) {
        console.error("Erro ao obter agendados:", err);
        renderReservados([]);
      }
    });

    wrapper.appendChild(btn);
    if (daysContainer) daysContainer.appendChild(wrapper);
  });

  // renderReservados (mantive igual)
  function renderReservados(items) {
    const gridAg = document.getElementById("gridAgendados");
    if (!gridAg) {
      console.warn("Elemento #gridAgendados não encontrado.");
      return;
    }
    gridAg.innerHTML = "";
    if (!items || !items.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Nenhum agendado para esta data.";
      gridAg.appendChild(empty);
      return;
    }

    items.forEach((it) => {
      const name = it.person?.name || it.name || it.personName || "—";

      const el = document.createElement("div");
      el.className = "agendado-card";
      el.innerHTML = `
        <div class="avatar"><i class="bi bi-check-circle-fill"></i></div>
        <div class="name">${name}</div>
      `;
      gridAg.appendChild(el);
    });
  }

  // cria/atualiza botões de enviar (chamada final)
  criarBotoesEnviar();
}

async function carregarReservados() {
  const raw = sessionStorage.getItem("selectedServiceInfo");
  if (!raw) {
    console.warn("selectedServiceInfo não encontrado na sessionStorage.");
    return;
  }

  let selected;
  try {
    selected = JSON.parse(raw);
  } catch (err) {
    console.error("Falha ao parsear selectedServiceInfo:", err);
    return;
  }

  try {
    const response = await fetchData("/reserved/search", "PUT", {
      selected,
    });

    console.log("RESPONSE:", response);

    const grid = document.getElementById("gridAgendados");
    grid.innerHTML = "";

    if (response.length === 0) {
      grid.innerHTML = `<div class="muted">Nenhum reservado encontrado</div>`;
      return;
    }

    response.forEach((r) => {
      grid.innerHTML += `
        <div class="agendado-card">
          <div class="avatar">${r.person.name[0]}</div>
          <div class="name">${r.person.name}</div>
        </div>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}
