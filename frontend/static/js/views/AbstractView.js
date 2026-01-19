export default class {
  constructor(params) {
    this.params = params;
    this.user;

    this.list_role = [];

    this.list_role["receptionist"] = "Recepção";
    this.list_role["scheduler"] = "Agendamento";
    this.list_role["schedulerManager"] = "Gestão de Agendas";
    this.list_role["attendant"] = "Atendimento";
    this.list_role["transportManager"] = "Gestão de Transporte";
    this.list_role["manager"] = "Gestão";
  }

  setTitle(title) {
    document.title = title;
  }

  async getHtml() {
    return "";
  }

  async init() {}
  getMenu() {
    let row = ``;

    const user = get_property_from_storage("user");
    console.log("user aqui:", user);

    if (user.attendanceUnit && user.attendanceUnit.length > 1) {
      row += `
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle"
           data-bs-toggle="dropdown"
           href="#"
           role="button"
           aria-expanded="false">
          Unidades
        </a>
        <ul class="dropdown-menu">
    `;

      for (let i = 0; i < user.attendanceUnit.length; i++) {
        const unit = user.attendanceUnit[i];
        row += `
        <li>
          <!-- Ao clicar, chama selectUnit() e recarrega -->
          <a class="dropdown-item"
             href="#"
             onclick="selectUnit('${unit._key}')">
            ${unit.name}
          </a>
        </li>
        <li>
          <hr class="dropdown-divider">
        </li>
      `;
      }

      row += `
        </ul>
      </li>
    `;
    }

    // pega a lista de roles da sessão ativa
    const activeUnit = user.activeSession && user.activeSession.attendanceUnit;
    if (
      activeUnit &&
      Array.isArray(activeUnit.list_role) &&
      activeUnit.list_role.length > 0
    ) {
      // **1) inicializa selectedRole, se ainda não existir**
      if (!localStorage.getItem("selectedRole")) {
        localStorage.setItem("selectedRole", activeUnit.list_role[0]);
      }
      const selected = localStorage.getItem("selectedRole");

      row += `
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle"
         data-bs-toggle="dropdown"
         href="#"
         role="button"
         aria-expanded="false">
        Perfis
      </a>
      <ul class="dropdown-menu">
    `;

      // **2) ao criar cada <a>, já aplicamos a classe e o ícone no que estiver marcado**
      for (let role of activeUnit.list_role) {
        const isActive = role === selected;
        const label = this.list_role[role];
        row += `
        <li>
          <a class="dropdown-item${
            isActive ? " bg-primary text-white fw-bold" : ""
          }"
             href="/dashboard/${role}"
             data-role="${role}">
            ${isActive ? '<i class="bi bi-check2 me-1"></i>' : ""}${label}
          </a>
        </li>
        <li><hr class="dropdown-divider"></li>
      `;
      }

      row += `
      </ul>
    </li>
    `;
    }

    row += `<li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#" role="button" aria-expanded="false">Usuário</a>
                <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="/user/changePass">Alterar Senha</a></li> 
                        <hr class="dropdown-divider">
                        <li><button class="dropdown-item" onclick="logoff()">Sair</button></li>
                
                    </li>
                    </ul>
            </li>
        <img onload="updateDashboardView()" style="display:none" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" >

`;

    row += `
  <li class="nav-item">
    <a class="nav-link" href="/user/aboutSystem">Sobre o Sistema</a>
  </li>
`;
    return row;
  }

  async remove_from_buffer(key) {
    window.sessionStorage.removeItem(key);
  }

  async preGetHtml() {
    return "";
  }
}
