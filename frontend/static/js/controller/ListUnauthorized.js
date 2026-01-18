async function showViewUnauthorized() {
  await loadPersonUnauthorized();
  setupDetailUnauthorized();
}

function setupDetailUnauthorized() {
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

async function loadPersonUnauthorized() {
  const container = document.getElementById("personUnauthorized");
  if (!container) {
    console.error("Container #personUnauthorized não encontrado.");
    return;
  }

  try {
    const response = await fetchData(
      "/authorization/unauthorized/search",
      "GET"
    );
    if (!response || !response.success || !Array.isArray(response.data)) {
      console.warn("Resposta inválida da API", response);
      return;
    }

    container.innerHTML = "";
    container.classList.add("tree");

    response.data.forEach((entry) => {
      // suporta { services: [...] } ou { svc: {...} }
      const person = entry.person || {};
      const inProcessKey = entry.inProcessKey || entry._key || null;
      const servicesFromArray = Array.isArray(entry.services)
        ? entry.services
        : null;
      const singleSvc = entry.svc || entry.svcItem || null;
      const services = servicesFromArray || (singleSvc ? [singleSvc] : []);

      const personDetails = document.createElement("details");
      personDetails.classList.add("unit-block");

      const personSummary = document.createElement("summary");
      personSummary.style.display = "flex";
      personSummary.style.alignItems = "center";
      personSummary.style.justifyContent = "space-between";

      personSummary.innerHTML = `
        <span class="fw-semibold text-danger">${
          person.name || "Nome não informado"
        }</span>
        <i class="bi bi-chevron-down ms-1"></i>
      `;

      personDetails.appendChild(personSummary);

      const serviceList = document.createElement("ul");
      serviceList.classList.add("nested");

      services.forEach((svc) => {
        const li = document.createElement("li");
        li.classList.add("service-item", "py-2", "px-3", "mb-1");
        li.style.borderLeft = "4px solid var(--bs-danger)";
        li.style.borderRadius = "0.375rem";
        li.style.background = "#fff";
        li.style.cursor = "pointer";
        li.style.transition = "background 0.2s, color 0.2s";
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.justifyContent = "space-between";

        li.onmouseover = () => {
          li.style.background = "var(--bs-danger)";
          li.style.color = "#fff";
          li.querySelectorAll("i, span, small").forEach((el) => {
            el.style.color = "#fff";
          });
          const btn = li.querySelector("button");
          if (btn) {
            btn.style.backgroundColor = "white";
            btn.style.color = "var(--bs-danger)";
            const bi = btn.querySelector("i");
            if (bi) bi.style.color = "var(--bs-danger)";
          }
        };

        li.onmouseout = () => {
          li.style.background = "#fff";
          li.style.color = "";
          li.querySelectorAll("i").forEach(
            (el) => (el.style.color = "var(--bs-danger)")
          );
          li.querySelectorAll("span").forEach((el) => (el.style.color = ""));
          li.querySelectorAll("small").forEach(
            (el) => (el.style.color = "#6c757d")
          );
          const btn = li.querySelector("button");
          if (btn) {
            btn.style.backgroundColor = "#fff";
            btn.style.color = "#dc3545";
            const bi = btn.querySelector("i");
            if (bi) bi.style.color = "#dc3545";
          }
        };

        let dataFormatada = "Data não informada";
        const dateRaw =
          svc?.start?.date || svc?.startDate || svc?.timestamp?.date;
        if (dateRaw) {
          try {
            let dateObj;
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
              dateObj = new Date(dateRaw + "T00:00:00");
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw)) {
              const [d, m, y] = dateRaw.split("/");
              dateObj = new Date(`${y}-${m}-${d}T00:00:00`);
            } else {
              dateObj = new Date(dateRaw);
            }
            if (!Number.isNaN(dateObj.getTime())) {
              dataFormatada = dateObj.toLocaleDateString("pt-BR");
            }
          } catch (e) {
            // mantém "Data não informada"
          }
        }

        li.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px;">
            <i class="bi bi-diagram-3-fill"></i>
            <span class="fw-medium">${
              svc?.serviceType?.nome ||
              svc?.serviceType?.name ||
              svc?.typeService?.name ||
              svc?.service ||
              "Tipo não informado"
            }</span>
            <small class="ms-2">${dataFormatada}</small>
          </div>
        `;

        serviceList.appendChild(li);
      });

      personDetails.appendChild(serviceList);
      container.appendChild(personDetails);
    });
  } catch (err) {
    console.error("Erro ao carregar árvore de pessoas NÃO_AUTORIZADO:", err);
    alert(
      "Erro ao carregar árvore de agendamentos NÃO_AUTORIZADOS por pessoa."
    );
  }
}
