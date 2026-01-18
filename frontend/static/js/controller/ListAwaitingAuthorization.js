async function showViewAuthorization() {
  await loadPersonTree();
  setupDetailPerson();
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

function setupDetailPerson() {
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

function showAuthorization(base64pdf, promiseServiceKey) {
  const container = document.getElementById("pdfPreview");
  const personTree = document.getElementById("container");

  if (!container) {
    alert("Elemento #pdfPreview não encontrado.");
    return;
  }

  // Oculta a árvore de pessoas
  if (personTree) {
    personTree.style.display = "none";
  }

  // Renderiza PDF + botão de confirmação
  container.innerHTML = `
    <div class="card">
      <embed src="data:application/pdf;base64,${base64pdf}" type="application/pdf" width="100%" height="600px" />
      <div class="card-footer">
        <button class="btn btn-success form-control fw-bold" onclick="confirmPromiseService('${promiseServiceKey}')">
          <i class="bi bi-check-circle-fill me-1"></i> Confirmo a Entrega da Autorização
        </button>
      </div>
    </div>
  `;
}

async function loadPersonTree() {
  const container = document.getElementById("personContainer");
  if (!container) {
    console.error("Container #personContainer não encontrado.");
    return;
  }

  try {
    const response = await fetchData("/authorization/search", "GET");
    if (!response.success || !Array.isArray(response.data)) {
      console.warn("Resposta inválida da API");
      return;
    }

    container.innerHTML = "";
    container.classList.add("tree");

    response.data.forEach((entry) => {
      const { person, services } = entry;

      const personDetails = document.createElement("details");
      personDetails.classList.add("unit-block");

      const personSummary = document.createElement("summary");
      personSummary.style.display = "flex";
      personSummary.style.alignItems = "center";
      personSummary.style.justifyContent = "space-between";

      personSummary.innerHTML = `
        <span class="fw-semibold text-primary">${person.name}</span>
        <i class="bi bi-chevron-down ms-1"></i>
      `;

      personDetails.appendChild(personSummary);

      const serviceList = document.createElement("ul");
      serviceList.classList.add("nested");

      services.forEach((svc) => {
        const li = document.createElement("li");
        li.classList.add("service-item", "py-2", "px-3", "mb-1");
        li.style.borderLeft = "4px solid var(--bs-success)";
        li.style.borderRadius = "0.375rem";
        li.style.background = "#fff";
        li.style.cursor = "pointer";
        li.style.transition = "background 0.2s, color 0.2s";
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.justifyContent = "space-between";

        li.onmouseover = () => {
          li.style.background = "var(--bs-primary)";
          li.style.color = "#fff";
          li.querySelectorAll("i, span, small").forEach((el) => {
            el.style.color = "#fff";
          });
          // Botão também muda no hover
          const btn = li.querySelector("button");
          if (btn) {
            btn.style.backgroundColor = "white";
            btn.style.color = "var(--bs-primary)";
            btn.querySelector("i").style.color = "var(--bs-primary)";
          }
        };

        li.onmouseout = () => {
          li.style.background = "#fff";
          li.style.color = "";
          li.querySelectorAll("i").forEach(
            (el) => (el.style.color = "var(--bs-success)")
          );
          li.querySelectorAll("span").forEach((el) => (el.style.color = ""));
          li.querySelectorAll("small").forEach(
            (el) => (el.style.color = "#6c757d")
          );
          // Botão volta ao normal
          const btn = li.querySelector("button");
          if (btn) {
            btn.style.backgroundColor = "#fff";
            btn.style.color = "#dc3545";
            btn.querySelector("i").style.color = "#dc3545";
          }
        };

        const dataFormatada = new Date(
          svc.start?.date + "T00:00"
        ).toLocaleDateString("pt-BR");

        li.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px;">
            <i class="bi bi-diagram-3-fill"></i>
            <span class="fw-medium">${
              svc.serviceType?.nome || "Tipo não informado"
            }</span>
            <small class="ms-2">${dataFormatada}</small>
          </div>
          <button 
            title="Marcar como ausente" 
            data-promise="${svc._key}"
            style="
              background-color: #fff;
              border: 2px solid #dc3545;
              color: #dc3545;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.2rem;
              cursor: pointer;
              transition: all 0.2s ease;
              flex-shrink: 0;
            "
            onmouseover="
              this.style.backgroundColor='#dc3545';
              this.querySelector('i').style.color='#fff';
            "
            onmouseout="
              this.style.backgroundColor='#fff';
              this.querySelector('i').style.color='#dc3545';
            "
          >
            <i class="bi bi-x-circle-fill" style="color:#dc3545;"></i>
          </button>
        `;

        // Evento para exibir autorização (ao clicar no li, mas fora do botão)
        li.addEventListener("click", async (e) => {
          if (e.target.tagName.toLowerCase() === "button") {
            // clique no botão, não propaga para li
            return;
          }
          e.stopPropagation();

          const inProcessKey = entry.inProcessKey;
          const promiseServiceKey = svc._key;

          if (!inProcessKey || !promiseServiceKey) {
            console.warn("Chave de InProcess ou PromiseService ausente.");
            return;
          }

          try {
            const response = await fetchData(
              `/authorization/${inProcessKey}?promiseServiceKey=${promiseServiceKey}`,
              "GET"
            );

            if (!response || !response.authorization) {
              alert("Não foi possível carregar os dados de autorização.");
              return;
            }

            showAuthorization(response.authorization, promiseServiceKey);
          } catch (err) {
            console.error("Erro ao buscar autorização:", err);
            alert("Erro ao buscar dados de autorização.");
          }
        });

        // Evento do botão "Marcar como ausente"
        // Evento do botão "Marcar como ausente"
        const btn = li.querySelector("button");

        // Previne que hover do botão dispare hover do li
        btn.addEventListener("mouseover", (e) => e.stopPropagation());
        btn.addEventListener("mouseout", (e) => e.stopPropagation());

        btn.addEventListener("click", async (e) => {
          e.stopPropagation();

          const promiseServiceKey = svc._key;

          if (!promiseServiceKey) {
            alert("Chave do serviço não encontrada.");
            return;
          }

          if (!confirm(`Deseja marcar esse serviço como ausente?`)) return;

          const userPropertyRaw = get_property_from_storage("user");

          const userProperty = {
            iat: userPropertyRaw.iat,
            _key: userPropertyRaw.sub,
            name: userPropertyRaw.person.name,
            person: userPropertyRaw.person,
            activeSession: userPropertyRaw.activeSession,
          };

          try {
            const resp = await fetchData("/authorization/noShow", "PUT", {
              promiseServiceKey,
              userProperty,
            });

            console.log(promiseServiceKey);

            if (resp.success) {
              alert("Serviço marcado como ausente com sucesso.");
              loadPersonTree(); // recarrega a lista para atualizar status
            } else {
              alert("Erro ao marcar ausência.");
            }
          } catch (err) {
            console.error("Erro ao marcar ausência:", err);
            alert("Erro ao marcar ausência.");
          }
        });

        serviceList.appendChild(li);
      });

      personDetails.appendChild(serviceList);
      container.appendChild(personDetails);
    });
  } catch (err) {
    console.error("Erro ao carregar árvore de pessoas:", err);
    alert("Erro ao carregar árvore de agendamentos por pessoa.");
  }
}

async function confirmPromiseService(promiseServiceKey) {
  if (!promiseServiceKey) {
    alert("Serviço não identificado.");
    return;
  }

  if (!confirm("Deseja realmente confirmar este atendimento?")) return;

  try {
    const response = await fetchData("/authorization/status", "PUT", {
      promiseServiceKey,
    });

    if (response.success) {
      alert("Atendimento confirmado com sucesso!");
      // Opcional: recarregar árvore
      loadPersonTree();
      // Ocultar o preview
      document.getElementById("pdfPreview").innerHTML = "";
      document.getElementById("container").style.display = "block";
    } else {
      alert("Não foi possível confirmar.");
    }
  } catch (err) {
    console.error("Erro ao confirmar:", err);
    alert("Erro ao confirmar atendimento.");
  }
}
