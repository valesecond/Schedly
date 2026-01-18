async function showViewRequest() {
  getObservationsAndPriorityHtml()
}

let selectedTypeServiceKey = "";

function getObservationsAndPriorityHtml() {
  const obs = window.schedulingDoc.requestPhase.observations?.trim() || "—";
  const groups = window.schedulingDoc.requestPhase.priorityGroup || [];
  const labels = { pregnant: "Gestante", elderly: "Idoso", disabilities: "PcD" };

  const badges = groups
    .map(
      (g) => `
      <span class="badge rounded-0 bg-primary bg-opacity-10 text-primary py-1 px-2">
        ${labels[g] || g}
      </span>`
    )
    .join("");
  return `
    <div class="row mt-3 mb-1 px-5 rounded-3 text-start gx-2"
    style="min-width:400px;"
    >
      <!-- Observações -->
      <div class="col-md-6">
        <div class="border border-secondary-subtle rounded-3 p-3 h-100 shadow-sm">
          <div class="d-flex align-items-center mb-1">
            <i class="bi bi-chat-dots-fill me-2 text-primary"></i>
            <h6 class="mb-0 fw-semibold">Observações</h6>
          </div>
          <p class="mb-0 text-muted">${obs}</p>
        </div>
      </div>
      <!-- Grupo Prioritário -->
      <div class="col-md-6">
        <div class="border border-secondary-subtle rounded-3 p-3 h-100 shadow-sm">
          <div class="d-flex align-items-center mb-1">
            <i class="bi bi-people-fill me-2 text-primary"></i>
            <h6 class="mb-0 fw-semibold">Grupo Prioritário</h6>
          </div>
          <div class="d-flex flex-wrap gap-2">
            ${badges || '<span class="text-muted">—</span>'}
          </div>
        </div>
      </div>
    </div>
  `;
  
} 

const buttons = Array.from(document.querySelectorAll(".request-btn"));
let selected = 0;

