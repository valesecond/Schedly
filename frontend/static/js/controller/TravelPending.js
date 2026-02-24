async function openTravelPendings() {
  // refs
  const listEl = document.getElementById("travelList");
  const countEl = document.getElementById("countTravels");
  const fltUnit = document.getElementById("fltUnit");
  const fltDate = document.getElementById("fltDate");
  const fltService = document.getElementById("fltService");
  const btnApply = document.getElementById("btnApply");
  const btnClear = document.getElementById("btnClear");

  // ✅ começa SEMPRE com o dia atual
  const todayISO = new Date().toISOString().slice(0, 10);
  if (fltDate && !fltDate.value) fltDate.value = todayISO;

  let travels = [];
  let allUnits = [];
  let allServices = [];

  function safeText(v) {
    const s = (v || "").toString().trim();
    return s ? s : "—";
  }

  function fmtBR(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR");
  }

  function humanPeriod(p) {
    if (!p) return "";
    if (p === "manha") return "Manhã";
    if (p === "tarde") return "Tarde";
    if (p === "noite") return "Noite";
    return p;
  }

  function firstServiceLabel(t) {
    return (
      t?.mainService ||
      t?.persons?.[0]?.serviceType?.nome ||
      t?.persons?.[0]?.serviceType?.name ||
      "—"
    );
  }

  function firstStartLabel(t) {
    const s = t?.persons?.[0]?.start;
    if (!s?.date) return null;
    const dt = fmtBR(s.date);
    const per = humanPeriod(s.period);
    return per ? `${dt} • ${per}` : dt;
  }

  function unitLabel(t) {
    return safeText(t?.unit?.name || t?.unit?._key);
  }

  async function loadUnitsAndServicesSeed() {
    try {
      allUnits = await fetchData("/attendanceUnit/search", "GET");
    } catch {
      allUnits = [];
    }

    if (fltUnit) {
      fltUnit.innerHTML = `<option value="">Todas</option>`;
      allUnits
        .slice()
        .sort((a, b) => (a?.name || "").localeCompare(b?.name || ""))
        .forEach((u) => {
          const opt = document.createElement("option");
          opt.value = u?._key || "";
          opt.textContent = `${u?.name || u?._key || "—"}`;
          fltUnit.appendChild(opt);
        });
    }

    if (fltService) {
      fltService.innerHTML = `<option value="">Todos</option>`;
    }
  }

  function rebuildServiceFilterFromTravels(rows) {
    const map = new Map();
    rows.forEach((t) => {
      (t?.persons || []).forEach((p) => {
        const k = p?.serviceType?._key;
        const label = p?.serviceType?.nome || p?.serviceType?.name || k;
        if (k) map.set(k, label || k);
      });
    });

    allServices = Array.from(map.entries())
      .map(([k, label]) => ({ _key: k, nome: label }))
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

    const current = fltService?.value || "";

    if (fltService) {
      fltService.innerHTML = `<option value="">Todos</option>`;
      allServices.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s._key;
        opt.textContent = s.nome;
        fltService.appendChild(opt);
      });
      fltService.value = current;
    }
  }

  async function fetchTravels() {
    const payload = {
      status: "PENDENTE",
      unitKey: (fltUnit?.value || "").trim(),
      tripDate: (fltDate?.value || "").trim(), // ✅ já vem com hoje
      serviceKey: (fltService?.value || "").trim(),
    };

    const resp = await fetchData("/transportPhase/list", "PUT", payload);
    travels = Array.isArray(resp?.travels) ? resp.travels : [];
    rebuildServiceFilterFromTravels(travels);
  }

  function injectStylesOnce() {
    if (document.getElementById("travelCardStyles")) return;
    const style = document.createElement("style");
    style.id = "travelCardStyles";
    style.textContent = `
      .travel-card{
        border-radius: 18px !important;
        overflow: hidden;
        transition: transform .18s ease, box-shadow .18s ease;
        background: linear-gradient(135deg, rgba(13,110,253,.10), rgba(255,255,255,1) 45%);
      }
      .travel-card:hover{
        transform: translateY(-2px);
        box-shadow: 0 .75rem 1.5rem rgba(13,110,253,.12) !important;
      }
      .travel-pill{
        border-radius: 999px !important;
        padding: .35rem .6rem;
        font-weight: 700;
        letter-spacing: .2px;
        display: inline-flex;
        align-items: center;
        gap: .35rem;
        white-space: nowrap;
      }
      .travel-meta{
        display:flex;
        flex-wrap:wrap;
        gap:.5rem;
        margin-top:.5rem;
      }
      .travel-chip{
        border-radius: 12px;
        padding: .45rem .55rem;
        background: rgba(108,117,125,.08);
        color: #495057;
        display: inline-flex;
        align-items: center;
        gap: .45rem;
        font-size: .875rem;
      }
      .travel-chip i{ opacity:.85; }
      .travel-actions .btn{
        border-radius: 12px;
      }
      .travel-title{
        font-weight: 900;
        font-size: 1.05rem;
        line-height: 1.15;
      }
      .travel-sub{
        color:#6c757d;
        font-size:.9rem;
      }
      .travel-avatar{
        width:44px;height:44px;
        border-radius: 14px;
        display:grid;place-items:center;
        background: rgba(13,110,253,.15);
        color: var(--bs-primary);
        flex:0 0 auto;
      }
      .travel-k{
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: .78rem;
        color: rgba(108,117,125,.9);
      }
    `;
    document.head.appendChild(style);
  }

  function render() {
    injectStylesOnce();

    if (!listEl) return;
    listEl.innerHTML = "";

    if (countEl) countEl.textContent = String(travels.length);

    if (travels.length === 0) {
      listEl.innerHTML = `
        <div class="col-12">
          <div class="text-muted small">
            Nenhuma viagem pendente encontrada com esses filtros.
          </div>
        </div>
      `;
      return;
    }

    travels.forEach((t) => {
      const col = document.createElement("div");
      col.className = "col-12";

      const unit = unitLabel(t);
      const dtTrip = fmtBR(t?.tripDate);
      const peopleCount = t?.persons?.length || 0;
      const service = safeText(firstServiceLabel(t));
      const startLabel = firstStartLabel(t); // opcional (start do primeiro paciente)
      const driver = safeText(t?.driver);
      const dest = safeText(t?.destination);
      const vehicle = safeText(t?.vehicle);
      const key = safeText(t?._key);

      // badge
      const statusBadge = `
        <span class="travel-pill bg-warning text-dark">
          <i class="bi bi-hourglass-split"></i> ${safeText(t?.status)}
        </span>
      `;

      col.innerHTML = `
        <div class="card shadow-sm border-0 travel-card">
          <div class="card-body p-3 p-md-3">
            <div class="d-flex align-items-start justify-content-between gap-3">
              <div class="d-flex align-items-start gap-3" style="min-width:0;">
                <div class="travel-avatar">
                  <i class="bi bi-truck-front fs-4"></i>
                </div>

                <div style="min-width:0;">
                  <div class="travel-title text-truncate">
                    ${safeText(t?.name)}
                  </div>
                  <div class="travel-sub text-truncate">
                    <span class="fw-semibold text-primary">${unit}</span>
                    <span class="mx-1">•</span>
                    <span>${service}</span>
                    <span class="mx-1">•</span>
                    <span><i class="bi bi-people me-1"></i>${peopleCount}</span>
                    <span class="mx-1">•</span>
                    <span><i class="bi bi-calendar-event me-1"></i>${dtTrip}</span>
                  </div>

                  <div class="travel-meta">
                    <span class="travel-chip">
                      <i class="bi bi-person-badge"></i> ${driver}
                    </span>
                    <span class="travel-chip">
                      <i class="bi bi-geo-alt"></i> ${dest}
                    </span>
                    <span class="travel-chip">
                      <i class="bi bi-truck-front"></i> ${vehicle}
                    </span>
                    ${
                      startLabel
                        ? `<span class="travel-chip">
                             <i class="bi bi-clock"></i> ${startLabel}
                           </span>`
                        : ``
                    }
                  </div>

                  <div class="mt-2 travel-k">
                    <i class="bi bi-hash"></i> ${key}
                  </div>
                </div>
              </div>

              <div class="d-flex flex-column align-items-end gap-2">
                ${statusBadge}
                <div class="travel-actions d-flex gap-2">
                  <button class="btn btn-outline-danger btn-sm" data-action="cancel" data-key="${t?._key}">
                    <i class="bi bi-x-circle me-1"></i> Cancelar
                  </button>
                  <button class="btn btn-success btn-sm" data-action="done" data-key="${t?._key}">
                    <i class="bi bi-check2-circle me-1"></i> Realizada
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      listEl.appendChild(col);
    });

    // bind actions
    listEl.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.onclick = async () => {
        const action = btn.getAttribute("data-action");
        const key = btn.getAttribute("data-key");
        if (!key) return;

        if (action === "done") {
          btn.disabled = true;
          try {
            await fetchData("/transportPhase/markDone", "PUT", {
              travelKey: key,
            });
            await fetchTravels();
            render();
          } catch (e) {
            console.error(e);
            alert("Erro ao marcar como realizada.");
          } finally {
            btn.disabled = false;
          }
        }

        if (action === "cancel") {
          const reason = prompt("Motivo do cancelamento (opcional):") || "";
          btn.disabled = true;
          try {
            await fetchData("/transportPhase/cancel", "PUT", {
              travelKey: key,
              reason,
            });
            await fetchTravels();
            render();
          } catch (e) {
            console.error(e);
            alert("Erro ao cancelar viagem.");
          } finally {
            btn.disabled = false;
          }
        }
      };
    });
  }

  // eventos filtros
  btnApply &&
    (btnApply.onclick = async () => {
      await fetchTravels();
      render();
    });

  btnClear &&
    (btnClear.onclick = async () => {
      if (fltUnit) fltUnit.value = "";
      // ✅ ao limpar, volta pro dia atual (não fica vazio)
      if (fltDate) fltDate.value = todayISO;
      if (fltService) fltService.value = "";
      await fetchTravels();
      render();
    });

  // ✅ refaz a busca automaticamente quando mudar a data (fica bem “dashboard”)
  fltDate &&
    fltDate.addEventListener("change", async () => {
      await fetchTravels();
      render();
    });

  // init
  await loadUnitsAndServicesSeed();
  await fetchTravels();
  render();
}
