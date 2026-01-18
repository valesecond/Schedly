let cachedDataOfYear = null;
let selectedMonth = null;

const listNameMonth = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

async function updateAnnualRequestReport(year) {
  const dataOfYear = await fetchData("/report/annualRequestCounter", "PUT", { year });
  cachedDataOfYear = dataOfYear;
  selectedMonth = null;
  renderAll(year);
  attachListeners(year);
}

function renderAll(year) {
  // 1) Calcula totais de cada mês (somando todas as especialidades)
  const monthTotals = {};
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, "0");
    monthTotals[key] = Object.values(cachedDataOfYear.list_specialties)
      .reduce((sum, spec) => sum + (spec.list_month[key]?.value || 0), 0);
  }

  // 2) Gera botões de mês
  let monthButtonsHtml = `<div class="my-3 text-center">`;
  Object.entries(monthTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([m, total]) => {
      const label = listNameMonth[+m - 1];
      const activeClass = selectedMonth === m ? "btn-primary" : "btn-outline-primary";
      monthButtonsHtml += `
        <button class="btn ${activeClass} month-btn" data-month="${m}">
          ${label}: ${total}
        </button>
      `;
    });
  monthButtonsHtml += `</div>`;

  // Se mês selecionado e não há requisições
  if (selectedMonth && monthTotals[selectedMonth] === 0) {
    const html = `
      <div class="card mb-3">
        <div class="card-body text-center">
          <h5>NENHUMA REQUISIÇÃO PARA ESSE MÊS</h5>
        </div>
      </div>
      ${monthButtonsHtml}
    `;
    document.getElementById("request-calendar").innerHTML = html;
    updateNavPills();
    return;
  }

  // 3) Monta array de especialidades com total anual ou por mês
  const specsArray = Object.entries(cachedDataOfYear.list_specialties)
    .map(([specName, spec]) => ({
      specName,
      total: selectedMonth ? (spec.list_month[selectedMonth]?.value || 0) : spec.value
    }))
    .sort((a, b) => b.total - a.total);

  // 4) Calcula altura dinâmica e gera cards de especialidade
  const itemsPerRow = 4;
  const rowCount = Math.ceil(specsArray.length / itemsPerRow);
  const rowHeight = 180;
  const maxHeight = 540;
  const containerHeight = Math.min(rowCount * rowHeight, maxHeight);

  let specialtiesHtml = `
    <div style="max-height:${containerHeight}px; overflow-y:auto; overflow-x:hidden;">
      <div class="row row-cols-1 row-cols-md-4 g-4 p-2 m-0">
  `;
  specsArray.forEach(({ specName, total }) => {
    specialtiesHtml += `
      <div class="col">
        <div class="card">
          <div class="card-header text-center">
            <h6 class="card-title mb-0">${specName}</h6>
          </div>
          <div class="card-body text-center">
            <h5 class="card-text">Total: ${total}</h5>
          </div>
        </div>
      </div>
    `;
  });
  specialtiesHtml += `
      </div>
    </div>
  `;

  // 5) Injeta HTML de cards e botões
  const totalGeral = specsArray.reduce((sum, item) => sum + item.total, 0);
  const headerText = selectedMonth
    ? `Visão por ${listNameMonth[+selectedMonth - 1]} – Especialidades`
    : `Total geral: ${totalGeral}`;
    
  const html = `
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="card-text">${headerText}</h5>
      </div>
      <div class="card-footer p-2" style="background-color: #fff;">
        ${specialtiesHtml}
      </div>
    </div>
    ${monthButtonsHtml}
  `;
  document.getElementById("request-calendar").innerHTML = html;

  // 6) Atualiza nav-pills
  updateNavPills();
}

function updateNavPills() {
  document.querySelectorAll(".nav-pills .nav-link").forEach(link => {
    const href = link.getAttribute('href');
    const linkYear = href.substring(href.lastIndexOf('/') + 1);
    if (link.classList.contains('active')) {
      // só o ativo muda para ano-mês
      link.textContent = selectedMonth
        ? `${linkYear} - ${listNameMonth[+selectedMonth - 1]}`
        : linkYear;
    } else {
      // os demais permanecem ano puro
      link.textContent = linkYear;
    }
  });
}

function attachListeners(year) {
  document.querySelectorAll(".month-btn").forEach(btn => {
    btn.onclick = () => {
      const m = btn.dataset.month;
      selectedMonth = selectedMonth === m ? null : m;
      renderAll(year);
      attachListeners(year);
    };
  });
}

// Inicialização: updateAnnualRequestReport(2025);
