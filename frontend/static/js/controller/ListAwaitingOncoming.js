async function showViewOncoming() {
  await loadConfirmationOncoming();
  setupDetailOncomming();
  OncomingFilterAction();
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
    endOfDay: endOfDay.toISOString(),
  };
}

async function OncomingFilterAction() {
  // 1) Captura valores dos campos
  const name = document.getElementById("name").value;
  const date = document.getElementById("startDate").value;
  const cpf = document.getElementById("id").value;
  const susCard = document.getElementById("susCard").value;
  const specialty = document.getElementById("specialty").value;

  // 2) Monta intervalo completo do dia (opcional, se quiser hora início/fim)
  const { startOfDay, endOfDay } = getDayInterval(date);

  // 3) Monta objeto de consulta (ou query string)
  const query = {
    name,
    dateTimeBegin: startOfDay,
    dateTimeEnd: endOfDay,
    id: cpf,
    susCard,
    specialty,
  };

  const response = await fetchData("/authorization/filter", "PUT", query);

  // 5) Re-renderiza a árvore com o resultado
  if (response.success && Array.isArray(response.data)) {
    loadConfirmationOncoming(response.data);
    setupDetailOncomming(); // reaplica animações no novo DOM
  } else {
    document.getElementById("personContainerConfirmation").innerHTML =
      "<p>Nenhum registro encontrado.</p>";
  }
}

function setupDetailOncomming() {
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

async function loadConfirmationOncoming() {
  const container = document.getElementById("personContainerConfirmation");
  if (!container) {
    console.error("Container #personContainerConfirmation não encontrado.");
    return;
  }

  try {
    const response = await fetchData("/authorization/search/authorized", "GET");
    if (!response.success || !Array.isArray(response.data)) {
      console.warn("Resposta inválida da API");
      return;
    }

    container.innerHTML = "";
    container.classList.add("tree");

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

        // Container texto (nome + data)
        const infoContainer = document.createElement("div");
        infoContainer.style.flexGrow = "1";
        infoContainer.style.display = "flex";
        infoContainer.style.flexDirection = "column";

        // Nome + Tipo de serviço
        const nameSpan = document.createElement("span");
        nameSpan.className = "fw-semibold text-primary";
        nameSpan.textContent = `${person.name} - ${
          service.serviceType?.nome || "Serviço"
        }`;

        // Data do atendimento
        const dataFormatada = new Date(
          service.start?.date + "T00:00"
        ).toLocaleDateString("pt-BR");
        const dataDiv = document.createElement("div");
        dataDiv.className = "text-muted small";
        dataDiv.textContent = `Data agendada: ${dataFormatada}`;

        infoContainer.appendChild(nameSpan);
        infoContainer.appendChild(dataDiv);

        // Botão circular no final do card
        const btnCheck = document.createElement("button");
        btnCheck.className =
          "btn btn-success d-flex circle-btn justify-content-center align-items-center";
        btnCheck.style.width = "32px";
        btnCheck.style.height = "32px";
        btnCheck.style.borderRadius = "50%";
        btnCheck.style.marginLeft = "12px"; // distância do texto
        btnCheck.innerHTML = `<i class="bi bi-check-lg text-white"></i>`;
        btnCheck.addEventListener("click", (e) => {
          e.stopPropagation();
          markShowOncoming(service._key);
        });

        personSummary.appendChild(infoContainer);
        personSummary.appendChild(btnCheck);

        personDetails.appendChild(personSummary);
        container.appendChild(personDetails);
      });
    });
  } catch (err) {
    console.error("❌ Erro ao carregar confirmações:", err);
    alert("Erro ao carregar lista de confirmações.");
  }
}

async function markShowOncoming(promiseServiceKey) {
  if (!promiseServiceKey) return alert("Serviço não identificado.");

  const confirmacao = confirm("Deseja confirmar que o paciente chegou?");
  if (!confirmacao) return;

  try {
    const response = await fetchData("/authorization/oncoming", "PUT", {
      promiseServiceKey,
      status: "CHEGADA_CONFIRMADA",
    });

    if (response.success) {
      alert("CHEGADA CONFIRMADA!");
      loadConfirmationOncoming();
    } else {
      alert("Não foi possível confirmar A CHEGADA.");
    }
  } catch (err) {
    console.error("Erro ao confirmar CHEGADA:", err);
    alert("Erro ao confirmar CHEGADA.");
  }
}
