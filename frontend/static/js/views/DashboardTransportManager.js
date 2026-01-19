import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  constructor(params) {
    super(params);
    this.setTitle("AgendaSaúde");
  }

  async init() {
    if (get_property_from_storage("user") == "") {
      window.open("/user/login", "_self");
    }
  }

  async getHtml() {
    function formatCPF(cpf) {
      cpf = cpf.toString().replace(/\D/g, "");
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }

    let row = ``;
    const user = get_property_from_storage("user");
    const activeUnitName =
      user.activeSession &&
      user.activeSession.attendanceUnit &&
      user.activeSession.attendanceUnit.name
        ? user.activeSession.attendanceUnit.name
        : "Sem unidade ativa";
    row += `
                
                <div class="card">
            <div class="card-header text-center w-100">
    <strong>Unidade Ativa:</strong> ${activeUnitName}
</div>

            <div class="card-body">
                <!-- Aqui você pode inserir o conteúdo principal do dashboard -->
            </div>
        </div>
        <div aria-live="polite" aria-atomic="true" class="d-flex justify-content-center align-items-center w-100">
            <div role="alert" aria-live="assertive" aria-atomic="true" class="toast" data-bs-autohide="false">
                <div class="toast-header">
                    <strong class="me-auto">Usuário:</strong>
                </div>
                <div class="toast-body">`;
    row += formatCPF(get_property_from_storage("user").person.cpf);
    row += `</div>
            </div>

            <div role="alert" aria-live="assertive" aria-atomic="true" class="toast" data-bs-autohide="false">
                <div class="toast-header">                    
                    <strong class="me-auto">Servidor:</strong>                    
                </div>
                <div class="toast-body">`;
    row += get_property_from_storage("user").name;
    row += `</div>
            </div>            
        </div>
        <img onload="updateDashboardView()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" >
`;

    return row;
  }

  async getMenu() {
    let row = ``;
    row += `
            <ul class="nav nav-tabs justify-content-center">
                <li class="nav-item">
                    <a class="nav-link active" href="#">Início</a>
                </li>
                
                  `;
    row += super.getMenu();
    row += `</ul>`;

    return row;
  }
}
