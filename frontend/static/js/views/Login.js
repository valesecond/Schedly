import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  result = "No Result";
  constructor(params) {
    super(params);
    this.setTitle("Login");
  }

  async getMenu() {
    return ``;
  }

  async getHtml() {
    return `

        <div class="d-flex justify-content-center align-items-center" style="height: 100vh;">
            <div class="card">
                <img 
                src="data:image/png;base64,${logo_extended}" 
                class="card-img-top" 
                alt="..." 
                style="max-width: 600px; max-height: 300px; object-fit: contain; margin: auto;">
                <div class="card-body">
                    <div class="form-floating">
                        <input
                        class="form-control aof-input"
                        type="text"
                        id="person_id"
                        maxlength="14"
                        required
                        placeholder="000.000.000-00"
                        oninput="formatCPF(this)"
                    />
                    <label for="person_id">CPF:</label>
                </div>
                <div class="form-floating">
                    <input
                    class="form-control aof-input"
                    type="password"
                    id="password"
                    placeholder=""
                    required
                />
                <label for="password">Senha:</label>
            </div>
        </div>
                <button
                    aof-view
                    class="btn btn-primary btn-lg form-control"
                    onclick="login()"
                >
                    Logar
                </button>
                <div id="error"></div>
            </div>
        </div>
                    `;
  }

  async init() {
    setTimeout(() => {
      const loginInputs = document.getElementsByClassName("aof-input");
      for (let i = 0; i < loginInputs.length; i++) {
        loginInputs[i].addEventListener("keydown", async (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            await login();
          }
        });
      }
    }, 50);
  }
}
