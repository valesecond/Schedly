async function showViewConfirmation() {
  await loadProvided();
  setupDetailConfirmation();
}

async function authorizationFilterAction() {
  // 1) Captura valores dos campos
  const name = document.getElementById("name").value;
  const date = document.getElementById("startDate").value;
  const cpf = document.getElementById("id").value;
  const susCard = document.getElementById("susCard").value;

  // 2) Monta intervalo completo do dia (opcional, se quiser hora início/fim)
  const { startOfDay, endOfDay } = getDayInterval(date);

  // 3) Monta objeto de consulta (ou query string)
  const query = {
    name,
    dateTimeBegin: startOfDay,
    dateTimeEnd: endOfDay,
    id: cpf,
    susCard,
  };

  const response = await fetchData("/authorization/search", "PUT", query);

  // 5) Re-renderiza a árvore com o resultado
  if (response.success && Array.isArray(response.data)) {
    buildPersonTree(response.data);
    setupDetailPerson(); // reaplica animações no novo DOM
  } else {
    document.getElementById("personContainer").innerHTML =
      "<p>Nenhum registro encontrado.</p>";
  }
}

function setupDetailConfirmation() {
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

let selectedServices = new Set();

async function loadProvided() {
  const container = document.getElementById("personContainerProvided");
  if (!container) {
    console.error("Container #personContainerProvided não encontrado.");
    return;
  }

  try {
    const response = await fetchData("/authorization/search/arrival", "GET");
    if (!response.success || !Array.isArray(response.data)) {
      console.warn("Resposta inválida da API");
      return;
    }

    container.innerHTML = "";
    container.classList.add("tree");

    // Cria botão de confirmar tudo
    const btnConfirmAll = document.createElement("button");
    btnConfirmAll.textContent = "Confirmar Selecionados";
    btnConfirmAll.className = "btn btn-primary mb-3";
    btnConfirmAll.disabled = true; // Desabilitado até selecionar algo
    btnConfirmAll.addEventListener("click", async () => {
      if (selectedServices.size === 0)
        return alert("Nenhum serviço selecionado.");

      const keysArray = Array.from(selectedServices);

      const userPropertyRaw = get_property_from_storage("user");

      const userProperty = {
        iat: userPropertyRaw.iat,
        _key: userPropertyRaw.sub,
        name: userPropertyRaw.person.name,
        person: userPropertyRaw.person,
        activeSession: userPropertyRaw.activeSession,
      };

      try {
        const response = await fetchData("/authorization/provided", "PUT", {
          servicesKeys: keysArray,
          status: "REALIZADO",
          userProperty,
        });

        if (response.success) {
          alert("Serviços confirmados com sucesso!");
          selectedServices.clear();
          btnConfirmAll.disabled = true;
          loadProvided(); // recarrega lista
        } else {
          alert("Erro ao confirmar serviços.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao confirmar serviços.");
      }
    });

    container.appendChild(btnConfirmAll);

    response.data.forEach(({ person, services }) => {
      services.forEach((service) => {
        const personDetails = document.createElement("details");
        personDetails.classList.add("unit-block");
        personDetails.open = false;
        personDetails.style.marginBottom = "0.5rem";

        const personSummary = document.createElement("summary");
        personSummary.className = "service-item d-flex align-items-center p-3";
        personSummary.style.borderRadius = "0.375rem";
        personSummary.style.background = "#fff";
        personSummary.addEventListener("click", (e) => e.preventDefault());

        const infoContainer = document.createElement("div");
        infoContainer.style.flexGrow = "1";
        infoContainer.style.display = "flex";
        infoContainer.style.flexDirection = "column";

        const nameSpan = document.createElement("span");
        nameSpan.className = "fw-semibold text-primary";
        nameSpan.textContent = `${person.name} - ${
          service.serviceType?.nome || "Serviço"
        }`;

        const dataAgendada = new Date(
          service.start?.date + "T00:00"
        ).toLocaleDateString("pt-BR");
        const horaChegada = service.arrivalTime?.time || "Hora não informada";

        const dataDiv = document.createElement("div");
        dataDiv.className = "text-muted small";
        dataDiv.textContent = `Data agendada: ${dataAgendada} - Hora chegada: ${horaChegada}`;

        infoContainer.appendChild(nameSpan);
        infoContainer.appendChild(dataDiv);

        // Checkbox no final do card
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.style.width = "20px";
        checkbox.style.height = "20px";
        checkbox.style.marginLeft = "12px";
        checkbox.addEventListener("click", (e) => {
          e.stopPropagation();
          if (checkbox.checked) {
            selectedServices.add(service._key);
          } else {
            selectedServices.delete(service._key);
          }
          btnConfirmAll.disabled = selectedServices.size === 0;
        });

        personSummary.appendChild(infoContainer);
        personSummary.appendChild(checkbox);

        personDetails.appendChild(personSummary);
        container.appendChild(personDetails);
      });
    });
  } catch (err) {
    console.error("❌ Erro ao carregar confirmações:", err);
    alert("Erro ao carregar lista de confirmações.");
  }
}

async function markShow(promiseServiceKey) {
  if (!promiseServiceKey) return alert("Serviço não identificado.");

  const confirmacao = confirm(
    "Deseja confirmar que o atendimento foi REALIZADO?"
  );
  if (!confirmacao) return;

  try {
    const response = await fetchData("/authorization/confirmation", "PUT", {
      promiseServiceKey,
      status: "REALIZADO",
    });

    if (response.success) {
      alert("Atendimento confirmado como REALIZADO!");
      loadConfirmationTree();
    } else {
      alert("Não foi possível confirmar o atendimento.");
    }
  } catch (err) {
    console.error("Erro ao confirmar atendimento:", err);
    alert("Erro ao confirmar atendimento.");
  }
}
