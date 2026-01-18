let cachedSchedulingCalendarData = null;
let selectedSchedulingMonth = null;

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

async function updateAnnualSchedulingReport(year) {
  const data = await fetchData("/report/annualSchedulingCounter", "PUT", { year });
  cachedSchedulingCalendarData = data;
  selectedSchedulingMonth = null;
  renderSchedulingCalendar(year);
  setupSchedulingCalendarListeners(year);
}

function renderSchedulingCalendar(year) {
  const data = cachedSchedulingCalendarData;

  // 1) Calcula totais de cada mês somando todos os statuses
  const monthTotals = {};
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, '0');
    monthTotals[key] = Object.values(data.list_statuses).reduce(
      (sum, st) => sum + (st.list_month[key]?.value || 0),
      0
    );
  }

  // 2) Gera botões de mês
  let monthButtonsHtml = `<div class="my-3 text-center">`;
  Object.entries(monthTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([m, total]) => {
      const label = MONTH_NAMES[+m - 1];
      const cls = selectedSchedulingMonth === m ? 'btn-primary' : 'btn-outline-primary';
      monthButtonsHtml += `
        <button class="btn ${cls} month-btn" data-month="${m}">
          ${label}: ${total}
        </button>`;
    });
  monthButtonsHtml += `</div>`;

  // 3) Se mês selecionado sem entradas
  if (selectedSchedulingMonth && monthTotals[selectedSchedulingMonth] === 0) {
    document.getElementById('scheduling-calendar').innerHTML = `
      <div class="card mb-3">
        <div class="card-body text-center">
          <h5>NENHUM AGENDAMENTO PARA ESSE MÊS</h5>
        </div>
      </div>
      ${monthButtonsHtml}
    `;
    updateSchedulingNavPills(year);
    return;
  }

  // 4) Cards de ESPECIALIDADES com total por mês ou geral
  const specsArray = Object.entries(data.list_specialties || {})
    .map(([specName, spec]) => {
      const total = selectedSchedulingMonth
        ? spec.list_month[selectedSchedulingMonth]?.value || 0
        : spec.value;
      return { specName, total };
    })
    .sort((a, b) => b.total - a.total);

  // scroll interno
  const perRow = 4;
  const rows = Math.ceil(specsArray.length / perRow);
  const rowH = 180;
  const maxH = 540;
  const contH = Math.min(rows * rowH, maxH);

  let specsHtml = `
    <div style="max-height:${contH}px; overflow-y:auto; overflow-x:hidden;">
      <div class="row row-cols-1 row-cols-md-4 g-4 p-2 m-0">
  `;
  specsArray.forEach(({ specName, total }) => {
    specsHtml += `
      <div class="col">
        <div class="card">
          <div class="card-header text-center"><h6>${specName}</h6></div>
          <div class="card-body text-center"><h5>Total: ${total}</h5></div>
        </div>
      </div>`;
  });
  specsHtml += `
      </div>
    </div>`;

  // 5) Cabeçalho dinâmico
  const headerText = selectedSchedulingMonth
    ? `Visão por ${MONTH_NAMES[+selectedSchedulingMonth - 1]} – Especialidades`
    : `Total geral: ${data.value}`;

  // 6) Injeta tudo
  const html = `
    <div class="card mb-3">
      <div class="card-body"><h5>${headerText}</h5></div>
      <div class="card-footer p-2 bg-white">${specsHtml}</div>
    </div>
    ${monthButtonsHtml}
  `;
  document.getElementById('scheduling-calendar').innerHTML = html;
  updateSchedulingNavPills(year);
}

function updateSchedulingNavPills(year) {
  document.querySelectorAll('.nav-pills .nav-link').forEach(link => {
    const yr = link.getAttribute('href').split('/').pop();
    if (link.classList.contains('active')) {
      link.textContent = selectedSchedulingMonth
        ? `${yr} - ${MONTH_NAMES[+selectedSchedulingMonth - 1]}`
        : yr;
    } else link.textContent = yr;
  });
}

function setupSchedulingCalendarListeners(year) {
  document.querySelectorAll('.month-btn').forEach(btn => {
    btn.onclick = () => {
      const m = btn.dataset.month;
      selectedSchedulingMonth = selectedSchedulingMonth === m ? null : m;
      renderSchedulingCalendar(year);
      setupSchedulingCalendarListeners(year);
    };
  });
}

// Inicialização: loadAnnualSchedulingCalendar(2025);
