async function showViewSchedule() {
  await loadSchedule();
  setupAnimations(); // animações
  initLimitSlider(); // slider
  initPeriodButtons(); // turnos
}

async function fetchSpecialists(unitKey, serviceTypeKey) {
  // Ajuste o endpoint se necessário (por padrão, "/search")
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

// --------------------------------------------------
// 2) Clique no especialista na árvore → abre card + sincroniza
// --------------------------------------------------
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
  // Atualiza o schedule
  window.schedule.attendanceUnit = { _key: unitKey, name: unitName };
  window.schedule.service = serviceName;
  window.schedule.serviceType = { _key: typeKey, name: typeName };
  window.schedule.specialist = { _key: specialistKey, name: specialistName };

  // Exibe calendário e oculta árvore
  document.querySelector(".card").classList.remove("d-none");
  document.getElementById("unitsContainer").classList.add("d-none");

  // (Re)inicializa calendário e controles
  updateCalendar.call(this);
  initLimitSlider();
  initPeriodButtons();

  // Preenche campo visível (se existir)
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

  function update() {
    const v = Number(rangeEl.value);
    valueEl.textContent = v;
    window.schedule.vacancyLimit = v;
    syncScheduleToForm();
    console.log("limitValue:", v);
  }

  update();

  rangeEl.addEventListener("input", update);
}

function initPeriodButtons() {
  // Pega todos os botões de turno
  const buttons = Array.from(document.querySelectorAll(".btn-turno"));
  if (!buttons.length) return;

  // Garante que o objeto existe
  window.schedule = window.schedule || {};

  // Se ainda não tiver period (primeiro load), já usa o default de this.doc.period
  // IMPORTANTE: não sobrescreve depois desse ponto
  if (!window.schedule.period) {
    // this.doc.period foi inicializado como "manha" no constructor
    window.schedule.period = this.doc?.period || "manha";
  }

  // Marca deles quem bate com o valor atual de schedule.period
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.value === window.schedule.period);

    // Limpa qualquer listener prévio e adiciona o novo
    btn.onclick = () => {
      // 1) Atualiza o modelo
      window.schedule.period = btn.value;

      // 2) Atualiza visual (active só no clicado)
      buttons.forEach((b) => b.classList.toggle("active", b === btn));

      // 3) Sincroniza com os hidden inputs
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
  const calendarGrid = document.getElementById("calendarGrid");
  const currentMonthYear = document.getElementById("currentMonthYear");
  const date = new Date(this.currentDate);

  if (this.viewMode === "month") {
    displayMonthView.call(this, calendarGrid, currentMonthYear, date);
  } else if (this.viewMode === "week") {
    displayWeekView(calendarGrid, currentMonthYear, date);
  } else if (this.viewMode === "day") {
    displayDayView(calendarGrid, currentMonthYear, date);
  }
}

function displayMonthView(calendarGrid, currentMonthYear, date) {
  date.setDate(1);
  const month = date.getMonth();
  const year = date.getFullYear();

  currentMonthYear.innerText = `${
    date.toLocaleString("default", { month: "long" }).charAt(0).toUpperCase() +
    date.toLocaleString("default", { month: "long" }).slice(1)
  } de ${year}`;

  currentMonthYear.style.color = "#007BFF";
  currentMonthYear.style.fontWeight = "bold";

  calendarGrid.innerHTML = "";

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  daysOfWeek.forEach((day) => {
    const dayLabel = document.createElement("div");
    dayLabel.className = "day-label";
    dayLabel.innerText = day;
    calendarGrid.appendChild(dayLabel);
  });

  const firstDayIndex = date.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Data de hoje no formato ISO (YYYY-MM-DD)
  const todayString = new Date().toISOString().split("T")[0];

  // Garante scheduledDays como array e REMOVE datas passadas (não permitir que já venham selecionadas)
  this.doc.scheduledDays = Array.isArray(this.doc.scheduledDays)
    ? this.doc.scheduledDays.filter((slot) => slot.date >= todayString)
    : [];

  let scheduledDays = new Set(
    (this.doc.scheduledDays || []).map((s) => s.date)
  );

  for (let i = 0; i < firstDayIndex; i++) {
    calendarGrid.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayBox = document.createElement("div");
    dayBox.className = "day-box";
    dayBox.innerText = day;

    const currentDate = new Date(year, month, day).toISOString().split("T")[0];
    dayBox.dataset.date = currentDate;

    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.className = "aof-input";
    hiddenInput.name = `selectedDate_${currentDate}`;
    hiddenInput.dataset.date = currentDate;

    // Se for passado (menor que hoje), marca como desabilitado e não permite clique
    if (currentDate < todayString) {
      dayBox.classList.add("past"); // estilo visual
      dayBox.setAttribute("aria-disabled", "true");
      // desabilita pointer events apenas visualmente — também protegemos no onclick abaixo
      dayBox.style.pointerEvents = "none"; // opcional, evita qualquer interação
      hiddenInput.disabled = true;
    } else {
      // Apenas datas >= hoje podem estar selecionadas
      if (scheduledDays.has(currentDate)) {
        dayBox.classList.add("selected");
        hiddenInput.value = currentDate;
      }
    }

    // Manipula o clique apenas para dias válidos (>= hoje)
    if (currentDate >= todayString) {
      dayBox.onclick = (event) => {
        const date = currentDate;
        const period = window.schedule.period;
        const vacancyLimit = window.schedule.vacancyLimit;

        const arr = this.doc.scheduledDays || [];

        if (event.ctrlKey) {
          const idx = arr.findIndex(
            (slot) => slot.date === date && slot.period === period
          );

          if (idx > -1) {
            arr.splice(idx, 1);
            dayBox.classList.remove("selected");
          } else {
            arr.push({ date, period });
            dayBox.classList.add("selected");
          }

          this.doc.scheduledDays = arr;
          updateHiddenInputs(arr);
          syncScheduleToForm();
          return;
        }

        // popup original (só para dias válidos)
        const popup = document.getElementById("day-popup");
        const popupDate = document.getElementById("popup-date");
        popupDate.innerText = `Você clicou no dia: ${date}`;
        popup.style.display = "flex";
        document.getElementById("save-popup").onclick = () =>
          (popup.style.display = "none");
        document.getElementById("popup-close").onclick = () =>
          (popup.style.display = "none");
        popup.onclick = (e) => {
          if (e.target === popup) popup.style.display = "none";
        };
      };
    }

    calendarGrid.appendChild(dayBox);
    calendarGrid.appendChild(hiddenInput);
  }
}

function syncScheduleToForm() {
  const form = document.getElementById("myForm") || document.body;

  // Remove todos os hidden inputs antigos
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

  // 1) attendanceUnit (JSON)
  if (d.attendanceUnit?._key) {
    addInput(
      "attendanceUnit",
      JSON.stringify({
        _key: d.attendanceUnit._key,
        name: d.attendanceUnit.name,
      })
    );
  }

  // 2) serviceType (JSON)
  if (d.serviceType?._key) {
    addInput(
      "serviceType",
      JSON.stringify({
        _key: d.serviceType._key,
        name: d.serviceType.name,
      })
    );
  }

  // 3) service (string)
  if (d.service) {
    addInput("service", d.service);
  }

  // 4) limit (number)
  if (d.vacancyLimit != null) {
    addInput("limit", d.vacancyLimit);
  }

  if (d.period) {
    addInput("period", d.period);
  }

  // 5) scheduledDays (array de objetos {date, limit, period})
  if (Array.isArray(d.scheduledDays) && d.scheduledDays.length) {
    addInput("scheduledDays", JSON.stringify(d.scheduledDays));
  }

  // 6) specialist (objeto único ou array de objetos)
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

  console.log("Esse é o data:", data);

  window.open(`/schedule`, "_self");
}

function updateHiddenInputs(slots) {
  const form = document.getElementById("myForm") || document.body;
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
