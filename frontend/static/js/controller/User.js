function isFormValid() {
  const inputs = document.getElementsByClassName("aof-form");
  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i].classList.contains("invalid")) {
      return false;
    }
  }
  return true;
}

function turnInvalid(element) {
  element.classList.add("invalid");
  element.classList.remove("valid");
}

function turnValid(element) {
  element.classList.add("valid");
  element.classList.remove("invalid");
}

// ===== Validar senha antiga (assíncrono) =====
async function validate_old_pass(element) {
  const errorsDiv = document.getElementById("old-password-errors");
  let errors = [];

  const user = get_property_from_storage("user");

  const data = { oldPassword: element.value };

  data.user = user;

  console.log("data", data);

  const result = await fetchData("/user/validateOldPass", "PUT", data);

  if (result.error) {
    errors.push("Senha inválida.");
    turnInvalid(element);
  } else {
    turnValid(element);
  }

  errorsDiv.innerHTML = errors.join("<br>");
}

// ===== Validar nova senha =====
function validate_new_pass(element) {
  const errorsDiv = document.getElementById("new-password-errors");
  let errors = [];

  const value = element.value;
  turnValid(element); // assume válido até encontrar erro

  if (value.length < 8) {
    errors.push("A senha deve ter pelo menos 8 caracteres.");
    turnInvalid(element);
  }
  if (!/[A-Z]/.test(value)) {
    errors.push("A senha deve ter pelo menos 1 letra maiúscula.");
    turnInvalid(element);
  }

  errorsDiv.innerHTML = errors.join("<br>");
}

function validate_repeat(element) {
  const errorsDiv = document.getElementById("password-repeat-errors");
  let errors = [];

  const new_pass = document.getElementById("new_password").value;

  if (element.value !== new_pass) {
    errors.push("Diferente da nova senha.");
    turnInvalid(element);
  } else {
    turnValid(element);
  }

  errorsDiv.innerHTML = errors.join("<br>");
}

async function changePass() {
  const errorsDiv = document.getElementById("validate-form");
  let errors = [];

  const oldPassInput = document.getElementById("password");
  await validate_old_pass(oldPassInput);

  validate_new_pass(document.getElementById("new_password"));
  validate_repeat(document.getElementById("repeat_password"));

  if (!isFormValid()) {
    errors.push("Há pendências no formulário.");
    errorsDiv.innerHTML = errors.join("<br>");
    return;
  }

  const data = {
    new_password: document.getElementById("new_password").value,
  };

  await fetchData("/user/changePass", "PUT", data);
  logoff();
}
