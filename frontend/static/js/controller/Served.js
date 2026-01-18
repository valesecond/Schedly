async function showViewServed() {
  await loadConfirmationServed();
  setupDetailServed();
  ServedFilterAction()
}

function getDayInterval(date) {
    // Cria um objeto Date para o início do dia
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0); // Define as horas, minutos, segundos e milissegundos como 0

    // Cria um objeto Date para o final do dia
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999); // Define as horas, minutos, segundos e milissegundos para o fim do dia

    return {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
    };
}  

async function ServedFilterAction() {
  // 1) Captura valores dos campos
  const name = document.getElementById("name").value;
  const date = document.getElementById("startDate").value;
  const cpf = document.getElementById("id").value;
  const susCard = document.getElementById("susCard").value;
  const specialty = document.getElementById("specialty").value;

  const { startOfDay, endOfDay } = getDayInterval(date);

  const query = {
    name,
    dateTimeBegin: startOfDay,
    dateTimeEnd: endOfDay,
    id: cpf,
    susCard,
    specialty
  };

  const response = await fetchData("/authorization/filter", "PUT", query);

  if (response.success && Array.isArray(response.data)) {
    loadConfirmationServed(response.data);
    setupDetailOncomming(); // reaplica animações no novo DOM
  } else {
    document.getElementById("personContainerConfirmation").innerHTML =
      "<p>Nenhum registro encontrado.</p>";
  }
}
 
function setupDetailServed() {
  document.querySelectorAll(".tree details").forEach((details) => {
    const summary = details.querySelector("summary");
    const content = details.querySelector("ul");
    if (!summary || !content) return;

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
        details.open = true;
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

let allData = [];

async function loadConfirmationServed() {
  const container = document.getElementById("personContainerServed");
  const filter = document.getElementById("unitFilter");
  if (!container || !filter) return; // se qualquer um faltar, aborta silenciosamente

  try {
    const response = await fetchData("/authorization/search/served", "GET");
    if (!response.success || !Array.isArray(response.data)) {
      console.warn("Resposta inválida da API");
      return;
    }

    allData = response.data;
    populateUnitDropdown(allData);
    renderByUnit(filter.value || "ALL");

  } catch (err) {
    console.error("❌ Erro ao carregar confirmações:", err);
    alert("Erro ao carregar lista de confirmações.");
  }
}


function populateUnitDropdown(data) {
  const filter = document.getElementById("unitFilter");
  if (!filter) return;

  // remove opções antigas (exceto All)
  filter.querySelectorAll("option:not([value='ALL'])").forEach(o => o.remove());

  data.forEach(({ attendanceUnit: { _key, name } }) => {
    const exists = Array.from(filter.options).some(o => o.value === _key);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = _key;
      opt.textContent = name;
      filter.appendChild(opt);
    }
  });
}


function renderByUnit(unitKey) {
  const container = document.getElementById("personContainerServed");
  if (!container) return;
  container.innerHTML = "";

  const toRender = unitKey === "ALL"
    ? allData
    : allData.filter(d => d.attendanceUnit._key === unitKey);

  if (toRender.length === 0) {
    container.innerHTML = `<p class="text-muted">Nenhum serviço encontrado para esta unidade.</p>`;
    return;
  }

  toRender.forEach(({ attendanceUnit, services }) => {
    const unitDetails = document.createElement("details");
    unitDetails.classList.add("unit-block");
    unitDetails.style.marginBottom = "1rem";

    const unitSummary = document.createElement("summary");
    unitSummary.className = "unit-header p-3 mb-2 fw-bold";
    unitSummary.textContent = attendanceUnit.name;
    unitSummary.style.cursor = "pointer";

    unitDetails.appendChild(unitSummary);

    const list = document.createElement("div");
    list.classList.add("services-list", "py-3", "px-3", "ps-3");

    services.forEach(service => {
      const serviceItem = document.createElement("div");
      serviceItem.className = "service-item d-flex align-items-center mb-2 p-2 rounded shadow-sm";
      serviceItem.style.background = "#fff";

      const info = document.createElement("div");
      info.style.flexGrow = "1";
      info.style.display = "flex";
      info.style.flexDirection = "column";

      const title = document.createElement("span");
      title.className = "fw-semibold text-primary";
      title.textContent = `${service.person.name} – ${service.serviceType.nome}`;

      const dateDiv = document.createElement("small");
      dateDiv.className = "text-muted";
      dateDiv.textContent = `Agendado: ${new Date(service.start.date + "T00:00").toLocaleDateString("pt-BR")}`;

      info.appendChild(title);
      info.appendChild(dateDiv);

      const providedDiv = document.createElement("small");
      providedDiv.className = "text-muted ms-3";
      providedDiv.textContent = `Realizado: ${new Date(service.providedTime.datetime).toLocaleTimeString("pt-BR")}`;

      serviceItem.appendChild(info);
      serviceItem.appendChild(providedDiv);
      list.appendChild(serviceItem);
    });

    unitDetails.appendChild(list);
    container.appendChild(unitDetails);
  });
}
