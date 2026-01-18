import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  result = "No Result";
  constructor(params) {
    super(params);
    this.setTitle("Alterar Senha");
  }

  async getHtml() {
    return `
<div class="card-group">        
    <div class="card">
    </div>
    <div class="card">
        <div class="card-body">                        
            <div class="form-floating">
                <input class="form-control needs-validation aof-form invalid" type="password" id="password" oninput="validate_old_pass(this)" required/>
                <label for="password">Senha Atual:</label>
            </div>
            <div id="old-password-errors" class="text-danger"></div>
            <div id="new_password-validation" class="mt-2 text-muted">
                <p><strong>A nova senha deve atender aos seguintes critérios:</strong></p>
                <ul>
                    <li>Pelo menos <strong>8 caracteres</strong> no total.</li>
                    <li>Ao menos <strong>1 letra maiúscula</strong> (A-Z).</li>
                    <li>Ao menos <strong>1 número</strong> (0-9).</li>
                </ul>
            </div>            
            <div class="form-floating">
                <input class="form-control aof-form invalid" type="password" id="new_password" placeholder="" oninput="validate_new_pass(this)" required/>
                <label for="new_password">Nova Senha:</label>                        
            </div>
            <div id="new-password-errors" class="text-danger"></div>
            <div class="form-floating">
                <input class="form-control aof-form invalid" type="password" id="repeat_password" oninput="validate_repeat(this)" placeholder="" required/>
                <label for="repeat_password">Repita a Nova Senha:</label>                        
                <div id="repeat_password-validation" class=""></div>
            </div>
            <div id="password-repeat-errors" class="text-danger"></div>
        </div>
        <div class="card-footer">
            <button aof-view class="btn btn-primary btn-lg form-control" onclick="changePass(this)">Alterar Senha</button>
            <div id="validate-form" class="text-danger"></div>
        </div>
        <div id="error">
        </div>
    </div>
    <div class="card">
    </div>
</div>
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
          <a class="nav-link active" href="#">Alterar Senha</a>
        </li>
    `;
    menu += super.getMenu();
    menu += `</ul>`;
    return menu;
  }
}
