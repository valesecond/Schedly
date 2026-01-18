async function showViewSchedule() {
  await loadSchedule();
  setupAnimations(); // animações
  initLimitSlider(); // slider
  initPeriodButtons(); // turnos
}

async function fetchSpecialists(unitKey, serviceTypeKey) {
  const payload = {
    unit_key: unitKey,
    serviceType_key: serviceTypeKey,
  };
  return await fetchData("/specialist/search", "PUT", payload);
}

async function onTypeSelected({
  unitKey,
  unitName,
  serviceKey,
  serviceName,
  typeKey,
  typeName,
}) {
  // Preenche o schedule
  window.schedule.attendanceUnit = { _key: unitKey, name: unitName };
  window.schedule.service = serviceName;
  window.schedule.serviceType = { _key: typeKey, name: typeName };
  window.schedule.specialist = null; // limpa seleção anterior
  syncScheduleToForm(); // já injeta attendanceUnit, serviceType e service
}

function onSpecialistSelected({
  unitKey,
  unitName,
  serviceKey,
  serviceName,
  typeKey,
  typeName,
  specialistKey,
  specialistName,
}) {
  window.schedule.attendanceUnit = { _key: unitKey, name: unitName };
  window.schedule.service = serviceName;
  window.schedule.serviceType = { _key: typeKey, name: typeName };
  window.schedule.specialist = { _key: specialistKey, name: specialistName };

  document.querySelector(".card").classList.remove("d-none");
  document.getElementById("unitsContainer").classList.add("d-none");

  updateCalendar.call(this);
  initLimitSlider();
  initPeriodButtons();

  const sel = document.getElementById("selectedSpecialist");
  if (sel) sel.textContent = specialistName;

  syncScheduleToForm();
}

async function loadSchedule() {
  const container = document.getElementById("unitsContainer");
  if (!container) {
    console.error("Container #unitsContainer não encontrado.");
    return;
  }

  try {
    const units = await fetchData("/attendanceUnit/search", "GET");
    container.innerHTML = "";

    for (const unit of units) {
      const unitDetails = document.createElement("details");
      unitDetails.classList.add("unit-block");
      unitDetails.innerHTML = `
        <summary>
          <span>${unit.name}</span>
          <i class="bi bi-chevron-down"></i>
        </summary>
      `;

      const servicesContainer = document.createElement("ul");
      servicesContainer.classList.add("nested");

      for (const svc of unit.services) {
        const svcDetails = document.createElement("details");
        svcDetails.classList.add("service-block");
        svcDetails.innerHTML = `
          <summary>
            <span>${svc.name}</span>
            <i class="bi bi-chevron-down"></i>
          </summary>
        `;
        const typesUl = document.createElement("ul");
        typesUl.classList.add("nested");

        const types =
          Array.isArray(svc.types) && svc.types.length
            ? svc.types
            : [{ key: svc.key, nome: svc.name }];

        for (const type of types) {
          const typeDetails = document.createElement("details");
          typeDetails.classList.add("type-block");
          typeDetails.innerHTML = `
            <summary>
              <span>${type.nome}</span>
              <i class="bi bi-chevron-down"></i>
            </summary>
          `;

          const specUl = document.createElement("ul");
          specUl.classList.add("nested");
          typeDetails.appendChild(specUl);

          // ao abrir, busca especialistas e popula, se ainda não vieram
          typeDetails.addEventListener("toggle", async () => {
            if (typeDetails.open && specUl.childElementCount === 0) {
              try {
                const specs = await fetchSpecialists(unit._key, type.key);
                specs.forEach((sp) => {
                  const li = document.createElement("li");
                  li.dataset.unit = unit._key;
                  li.dataset.service = svc.key;
                  li.dataset.type = type.key;
                  li.dataset.specialist = sp._key;
                  li.classList.add("specialist-item");
                  li.style.justifyContent = "flex-start";
                  li.style.gap = "0.5rem";

                  // Monta string com todos credentials, ex: "CRM: 7035-RN, RQE: 4223"
                  const credentialsText = Array.isArray(sp.credential)
                    ? sp.credential
                        .map((c) => `${c.type}: ${c.code}`)
                        .join(", ")
                    : sp.credential
                    ? `${sp.credential.type}: ${sp.credential.code}`
                    : "";

                  li.innerHTML = `
    <i class="bi bi-person-badge-fill"></i>
    <span>${sp.name} <small>(${credentialsText})</small></span>
  `;

                  // clique no especialista já monta a agenda
                  li.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onSpecialistSelected({
                      unitKey: unit._key,
                      unitName: unit.name,
                      serviceKey: svc.key,
                      serviceName: svc.name,
                      typeKey: type.key,
                      typeName: type.nome,
                      specialistKey: sp._key,
                      specialistName: sp.name,
                    });
                  });

                  specUl.appendChild(li);
                });
              } catch (err) {
                console.error("Erro ao buscar especialistas:", err);
              }
            }
          });

          typesUl.appendChild(typeDetails);
        }

        svcDetails.appendChild(typesUl);
        servicesContainer.appendChild(svcDetails);
      }

      unitDetails.appendChild(servicesContainer);
      container.appendChild(unitDetails);
    }
  } catch (err) {
    console.error("Erro ao carregar unidades em árvore:", err);
    alert("Não foi possível carregar a árvore de unidades.");
  }
}

function attachHandlers() {
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

function setupAnimations() {
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
          { duration: 400, easing: "ease" }
        );
        anim.onfinish = () => {
          details.open = false;
          content.style.transform = "scaleY(0)";
        };
      } else {
        // — ABRIR —
        // marca como aberto para mostrar conteúdo
        details.open = true;
        // garante começar de 0
        content.style.transform = "scaleY(0)";
        const anim = content.animate(
          [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
          { duration: 600, easing: "ease" }
        );
        anim.onfinish = () => {
          content.style.transform = "scaleY(1)";
        };
      }
    });
  });
}

function initLimitSlider() {
  const rangeEl = document.getElementById("limitRange");
  const valueEl = document.getElementById("limitValue");
  if (!rangeEl || !valueEl) {
    console.error("Slider ou span não encontrados");
    return;
  }

  window.schedule = window.schedule || {};

  // seta o valor inicial do slider a partir do modelo
  if (window.schedule.vacancyLimit != null) {
    rangeEl.value = window.schedule.vacancyLimit;
  }

  function update() {
    const v = Number(rangeEl.value);
    valueEl.textContent = v;
    window.schedule.vacancyLimit = v;
    syncScheduleToForm();
    console.log("limitValue:", v);
  }

  // dispara uma vez para ajustar o <span> antes de ouvir eventos
  update();

  rangeEl.addEventListener("input", update);
}

function initPeriodButtons() {
  const buttons = Array.from(document.querySelectorAll(".btn-turno"));
  if (!buttons.length) return;

  window.schedule = window.schedule || {};

  // se não houver period, utiliza o padrão em this.doc.period ou "manha"
  if (!window.schedule.period) {
    window.schedule.period = this?.doc?.period || "manha";
  }

  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.value === window.schedule.period);
    btn.onclick = () => {
      window.schedule.period = btn.value;
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      syncScheduleToForm();
    };
  });
}

// função global que seu onclick vai chamar
window.selectPeriod = function (period) {
  // atualiza o modelo
  window.schedule = window.schedule || {};
  window.schedule.period = period;

  // reaplica a classe active
  document
    .querySelectorAll(".btn-turno")
    .forEach((b) => b.classList.remove("active"));
  const btn = document.querySelector(`.btn-turno[value="${period}"]`);
  if (btn) btn.classList.add("active");

  // sincroniza hidden inputs
  if (typeof syncScheduleToForm === "function") {
    syncScheduleToForm();
  }
};

function updateCalendar() {
  console.log("🕒 updateCalendar chamado");
  const calendarGrid = document.getElementById("calendarGrid");
  const currentMonthYear = document.getElementById("currentMonthYear");
  if (!calendarGrid || !currentMonthYear) {
    console.error("❌ Elementos do calendário não encontrados (calendarGrid ou currentMonthYear)");
    return;
  }

  if (!this.currentDate) {
    console.warn("⚠️ this.currentDate não definido. Usando data atual.");
    this.currentDate = new Date();
  }

  console.log("📅 this.currentDate:", this.currentDate);

  if (!this.viewMode) {
    console.warn("⚠️ this.viewMode não definido. Usando 'month' como padrão.");
    this.viewMode = "month";
  }

  if (this.viewMode === "month") {
    displayMonthView.call(this, calendarGrid, currentMonthYear, new Date(this.currentDate));
  } else if (this.viewMode === "week") {
    displayWeekView(calendarGrid, currentMonthYear, new Date(this.currentDate));
  } else if (this.viewMode === "day") {
    displayDayView(calendarGrid, currentMonthYear, new Date(this.currentDate));
  } else {
    console.error("❌ viewMode desconhecido:", this.viewMode);
  }
}

function displayMonthView(calendarGrid, currentMonthYear, date) {
  console.log("🕒 displayMonthView chamado");
  console.log("📅 Dados agendados (window.scheduleDoc.scheduledDays):", window.scheduleDoc?.scheduledDays);

  date.setDate(1);
  const month = date.getMonth();
  const year = date.getFullYear();

  // Título do mês e ano
  const monthName = date.toLocaleString("default", { month: "long" });
  currentMonthYear.innerText = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
  currentMonthYear.style.color = "#007BFF";
  currentMonthYear.style.fontWeight = "bold";

  calendarGrid.innerHTML = "";

  // Dias da semana
  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  daysOfWeek.forEach(day => {
    const dayLabel = document.createElement("div");
    dayLabel.className = "day-label";
    dayLabel.innerText = day;
    calendarGrid.appendChild(dayLabel);
  });

  const firstDayIndex = date.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Extrai datas agendadas para pintar (set de strings)
  const scheduledDaysSet = new Set(
    (window.scheduleDoc?.scheduledDays || [])
      .map(slot => slot.date)
      .filter(Boolean)
  );
  console.log("🎯 Datas a pintar:", [...scheduledDaysSet]);

  // Confirma se this.doc.scheduledDays existe
  if (!this.doc || !this.doc.scheduledDays) {
    console.warn("⚠️ this.doc.scheduledDays não definido, inicializando vazio.");
    this.doc = this.doc || {};
    this.doc.scheduledDays = [];
  }

  // Preenche dias vazios antes do início do mês
  for (let i = 0; i < firstDayIndex; i++) {
    calendarGrid.appendChild(document.createElement("div"));
  }

  // Cria os dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const dayBox = document.createElement("div");
    dayBox.className = "day-box";
    dayBox.innerText = day;

    // Gera a data ISO local (sem efeito de fuso)
    const currentDate = new Date(year, month, day);
    const currentDateISO = currentDate.toISOString().split("T")[0];

    console.log(`📆 Dia ${day}: currentDateISO = ${currentDateISO}`);

    dayBox.dataset.date = currentDateISO;

    // Input hidden
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.className = "aof-input";
    hiddenInput.name = `selectedDate_${currentDateISO}`;
    hiddenInput.dataset.date = currentDateISO;

    // Marca se a data está no agendamento
    if (scheduledDaysSet.has(currentDateISO)) {
      console.log(`✅ Dia ${currentDateISO} marcado como selecionado`);
      dayBox.classList.add("selected");
      hiddenInput.value = currentDateISO;
    }

    // Clique no dia
    dayBox.onclick = (event) => {
      const date = currentDateISO;
      const period = window.schedule?.period || "manha";
      const vacancyLimit = window.schedule?.vacancyLimit || 0;

      const arr = this.doc.scheduledDays || [];

      if (event.ctrlKey) {
        const idx = arr.findIndex(slot => slot.date === date && slot.period === period);
        if (idx > -1) {
          arr.splice(idx, 1);
          dayBox.classList.remove("selected");
          console.log(`➖ Removido slot ${date} período ${period}`);
        } else {
          arr.push({ date, period });
          dayBox.classList.add("selected");
          console.log(`➕ Adicionado slot ${date} período ${period}`);
        }
        this.doc.scheduledDays = arr;
        updateHiddenInputs(arr);
        syncScheduleToForm();
        return;
      }

      // Popup padrão
      const popup = document.getElementById("day-popup");
      const popupDate = document.getElementById("popup-date");
      if (!popup || !popupDate) {
        console.warn("⚠️ Popup ou popupDate não encontrados");
        return;
      }
      popupDate.innerText = `Você clicou no dia: ${date}`;
      popup.style.display = "flex";
      document.getElementById("save-popup").onclick = () => (popup.style.display = "none");
      document.getElementById("popup-close").onclick = () => (popup.style.display = "none");
      popup.onclick = (e) => { if (e.target === popup) popup.style.display = "none"; };
    };

    calendarGrid.appendChild(dayBox);
    calendarGrid.appendChild(hiddenInput);
  }
}


function syncScheduleToForm() {
  const form = document.getElementById("myForm") || document.body;

  form
    .querySelectorAll('input[type="hidden"].aof-input')
    .forEach((i) => i.remove());

  function addInput(name, value) {
    const inp = document.createElement("input");
    inp.type = "hidden";
    inp.className = "aof-input";
    inp.name = name;
    inp.value = value;
    form.appendChild(inp);
  }

  const d = window.schedule || {};

  if (d.attendanceUnit?._key) {
    addInput(
      "attendanceUnit",
      JSON.stringify({
        _key: d.attendanceUnit._key,
        name: d.attendanceUnit.name,
      })
    );
  }

  if (d.serviceType?._key) {
    addInput(
      "serviceType",
      JSON.stringify({
        _key: d.serviceType._key,
        name: d.serviceType.name,
      })
    );
  }

  if (d.service) {
    addInput("service", d.service);
  }

  if (d.vacancyLimit != null) {
    addInput("limit", d.vacancyLimit);
  }

  if (d.period) {
    addInput("period", d.period);
  }

  if (Array.isArray(d.scheduledDays) && d.scheduledDays.length) {
    addInput("scheduledDays", JSON.stringify(d.scheduledDays));
  }

  if (d.specialist) {
    let arr = [];
    if (Array.isArray(d.specialist)) {
      arr = d.specialist.map((sp) => ({ _key: sp._key, name: sp.name }));
    } else if (d.specialist._key) {
      arr = [{ _key: d.specialist._key, name: d.specialist.name }];
    }
    if (arr.length) {
      addInput("specialist", JSON.stringify(arr));
    }
  }

  // 7) observations (string)
  const obsEl = document.getElementById("observations");
  if (obsEl) {
    addInput("observations", obsEl.value.trim());
  }
}

async function saveSchedule() {
  syncScheduleToForm();

  const data = await formCopy();

  await save("/schedule", data);

  window.open(`/schedule`, "_self");

  console.log("Esse é o data:", data);
}

function updateHiddenInputs(slots) {
  const form = document.getElementById("myForm") || document.body;
  // remove eventuais inputs antigos
  form.querySelectorAll("input.slot-input").forEach((i) => i.remove());

  slots.forEach((slot, idx) => {
    const inp = document.createElement("input");
    inp.type = "hidden";
    inp.classList.add("slot-input", "aof-input");
    inp.name = `scheduledDays[${idx}]`;
    // depois
    inp.value = JSON.stringify({
      date: slot.date,
      period: slot.period,
    });

    form.appendChild(inp);
  });
}
