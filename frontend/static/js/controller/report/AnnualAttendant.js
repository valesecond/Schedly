let annualAttendantData = null;
let activeMonth = null;

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

async function updateAnnualAttendantReport(year) {
  const data = await fetchData("/report/annualAttendantCounter", "PUT", { year });
  annualAttendantData = data;
  activeMonth = null;
  renderAttendantReport(year);
  setupMonthButtonListeners(year);
}

function renderAttendantReport(year) {
  // 1) Totais mensais (soma de todas as especialidades)
  const totalsByMonth = {};
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, "0");
    totalsByMonth[key] = Object.values(annualAttendantData.list_specialties)
      .reduce((sum, spec) => sum + (spec.list_month[key]?.value || 0), 0);
  }

  // 2) Botões de seleção de mês
  let buttonsHtml = `<div class="my-3 text-center">`;
  Object.entries(totalsByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([m, total]) => {
      const label = monthNames[+m - 1];
      const btnClass = activeMonth === m ? "btn-primary" : "btn-outline-primary";
      buttonsHtml += `
        <button class="btn ${btnClass} month-btn" data-month="${m}">
          ${label}: ${total}
        </button>
      `;
    });
  buttonsHtml += `</div>`;

  if (activeMonth && totalsByMonth[activeMonth] === 0) {
    const html = `
      <div class="card mb-3">
        <div class="card-body text-center">
          <h5>NENHUM ATENDIMENTO PARA ESTE MÊS</h5>
        </div>
      </div>
      ${buttonsHtml}
    `;
    document.getElementById("attendant").innerHTML = html;
    updateYearNavPills();
    return;
  }

  const specialtiesList = Object.entries(annualAttendantData.list_specialties)
    .map(([name, spec]) => ({
      name,
      count: activeMonth ? (spec.list_month[activeMonth]?.value || 0) : spec.value
    }))
    .sort((a, b) => b.count - a.count);

  // 4) Layout responsivo de cards
  const perRow = 4;
  const rows = Math.ceil(specialtiesList.length / perRow);
  const cardHeight = 180;
  const maxHeight = 540;
  const containerH = Math.min(rows * cardHeight, maxHeight);

  let cardsHtml = `
    <div style="max-height:${containerH}px; overflow-y:auto; overflow-x:hidden;">
      <div class="row row-cols-1 row-cols-md-4 g-4 p-2 m-0">
  `;
  specialtiesList.forEach(({ name, count }) => {
    cardsHtml += `
      <div class="col">
        <div class="card">
          <div class="card-header text-center"><h6>${name}</h6></div>
          <div class="card-body text-center"><h5>Total: ${count}</h5></div>
        </div>
      </div>
    `;
  });
  cardsHtml += `</div></div>`;

  // 5) Monta o painel completo
  const grandTotal = specialtiesList.reduce((sum, s) => sum + s.count, 0);
  const header = activeMonth
    ? `Visão de ${monthNames[+activeMonth - 1]} – Especialidades`
    : `Total geral: ${grandTotal}`;

  document.getElementById("attendant").innerHTML = `
    <div class="card mb-3">
      <div class="card-body"><h5>${header}</h5></div>
      <div class="card-footer p-2" style="background-color:#fff;">
        ${cardsHtml}
      </div>
    </div>
    ${buttonsHtml}
  `;

  updateYearNavPills();
}

function updateYearNavPills() {
  document.querySelectorAll(".nav-pills .nav-link").forEach(link => {
    const href = link.getAttribute("href");
    const linkYear = href.slice(href.lastIndexOf("/") + 1);
    if (link.classList.contains("active")) {
      link.textContent = activeMonth
        ? `${linkYear} - ${monthNames[+activeMonth - 1]}`
        : linkYear;
    } else {
      link.textContent = linkYear;
    }
  });
}

function setupMonthButtonListeners(year) {
  document.querySelectorAll(".month-btn").forEach(btn => {
    btn.onclick = () => {
      const m = btn.dataset.month;
      activeMonth = activeMonth === m ? null : m;
      renderAttendantReport(year);
      setupMonthButtonListeners(year);
    };
  });
}

// Exemplo de inicialização:
// updateAnnualAttendantReport(2025);
