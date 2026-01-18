async function showViewDataScheduling() {
  await loadDataTree();
  setupDetailAnimations();
  attachTreeHandlers();
}

async function loadDataTree() {
  const container = document.getElementById("unitsContainer");
  container.innerHTML = "";
  const threshold = 10;

  try {
    let classes = await fetchData("/inProcess/search/data", "GET");

    classes.sort((a, b) => b.pendingCount - a.pendingCount);

    classes.forEach((cls) => {
      const clsDetails = document.createElement("details");
      const clsSummary = document.createElement("summary");

      const clsIndicator =
        cls.pendingCount > 0
          ? `<span
             class="spinner-grow spinner-grow-sm text-warning me-2"
             role="status"
             aria-hidden="true"
             title="Pendências neste serviço"
           ></span>`
          : "";

      const clsBadgeClass =
        cls.pendingCount > threshold ? "bg-danger" : "bg-primary";
      clsSummary.innerHTML = `
        <span>${cls.name}</span>
        <span class="d-flex align-items-center">
          ${clsIndicator}
          <span class="badge ${clsBadgeClass}">${cls.pendingCount}</span>
        </span>
      `;
      clsDetails.appendChild(clsSummary);

      const typesUl = document.createElement("ul");
      typesUl.classList.add("nested");

      cls.types
        .sort((a, b) => b.pendingCount - a.pendingCount)
        .forEach((type) => {
          const typeLi = document.createElement("li");

          const typeIndicator =
            type.pendingCount > 0
              ? `<span
               class="spinner-grow spinner-grow-sm text-warning me-1"
               role="status"
               aria-hidden="true"
               title="Pendências neste tipo de serviço"
             ></span>`
              : "";

          const typeBadgeClass =
            type.pendingCount > threshold ? "bg-danger" : "bg-warning";
          typeLi.innerHTML = `
          <span>${type.nome}</span>
          <span class="d-flex align-items-center">
            ${typeIndicator}
            <span class="badge ${typeBadgeClass}">${type.pendingCount}</span>
          </span>
        `;

          const rdUl = document.createElement("ul");
          rdUl.classList.add("nested", "d-none");
          type.requisitionDetails.forEach((rd) => {
            const rdLi = document.createElement("li");
            const rdBadgeClass =
              rd.count > threshold ? "bg-danger" : "bg-success";
            rdLi.innerHTML = `
            <span>${rd.name}</span>
            <span class="badge ${rdBadgeClass} ms-1">${rd.count}</span>
          `;
            rdUl.appendChild(rdLi);
          });

          typeLi.addEventListener("click", (e) => {
            e.stopPropagation();
            rdUl.classList.toggle("d-none");
          });

          typesUl.appendChild(typeLi);
          typesUl.appendChild(rdUl);
        });

      clsDetails.appendChild(typesUl);
      container.appendChild(clsDetails);
    });
  } catch (err) {
    console.error(err);
    alert("Não foi possível carregar os dados de InProcess.");
  }
}

function setupDetailAnimations() {
  document.querySelectorAll(".tree details").forEach((details) => {
    const summary = details.querySelector("summary");
    const content = details.querySelector("ul");
    content.style.overflow = "hidden";
    content.style.transformOrigin = "top";
    content.style.transform = details.open ? "scaleY(1)" : "scaleY(0)";
    summary.addEventListener("click", (e) => {
      e.preventDefault();
      if (details.open) {
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
        anim.onfinish = () => (content.style.transform = "scaleY(1)");
      }
    });
  });
}
function attachTreeHandlers() {
  document.querySelectorAll(".tree li[data-service]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      document
        .querySelectorAll(".tree li.active")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      // Exemplo de seleção: window.selected = { service, type }
      window.selected = {
        service: item.dataset.service,
        type: item.dataset.type,
      };
      document.getElementById("btnConfirm")?.removeAttribute("disabled");
    });
  });
}
