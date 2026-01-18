import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  constructor(params) {
    super(params);
    this.setTitle("Sobre o Sistema");
  }

  async init() {
    if (get_property_from_storage("user") == "") {
      window.open("/user/login", "_self");
    }
  }

  async getHtml() {
    return `
    <div id="about-system-videos" class="container mt-4"></div>
    <img style="display:none" onload="showViewAboutSystem()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">
  `;
  }

  async getMenu() {
    const role = localStorage.getItem("selectedRole");
    console.log("role", role);

    let menu = `
      <ul class="nav nav-tabs justify-content-center mb-4">
        <li class="nav-item">
          <a class="nav-link" href="/dashboard/${role}">Início</a>
        </li>
          <a class="nav-link active" href="#">Sobre o Sistema</a>
        </li>
    `;
    menu += super.getMenu();
    menu += `</ul>`;
    return menu;
  }
}
