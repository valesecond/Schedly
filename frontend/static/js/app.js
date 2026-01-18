const server = "http://localhost:6006";
let form_for_save = {};
let resp_factor = {};

function removeElement(id, ref_element) {
  const element = document.getElementById(id);

  const target_element = document.getElementById(ref_element);

  target_element.removeChild(element);
}

function insertOnePill(
  target_element_id,
  pill_id,
  pill_value,
  call_finish,
  call_select,
  call_remove,
  buttonClass
) {
  const target_element = document.getElementById(target_element_id);
  if (!buttonClass) {
    buttonClass = "btn-primary";
  }

  if (pill_value.includes("Exame")) {
    buttonClass += " btn-exame";
  } else if (pill_value.includes("Cirurgia")) {
    buttonClass += " btn-cirurgia";
  } else if (pill_value.includes("Tratamento")) {
    buttonClass += " btn-tratamento";
  } else if (pill_value.includes("Vacina")) {
    buttonClass += " btn-vacina";
  }

  buttonClass = `btn btn-sm ${buttonClass} ${pill_value.replace(" ", "")}`;
  let new_element = `
        <div class="btn-group">
            <input type="hidden" value="${pill_value}">
            <button type="button" class="${buttonClass}">${pill_value}</button>
            <button type="button" class="btn btn-sm aof-remove"><i class="fas fa-times"></i></button>
        </div>
    `;
  const b = document.createElement("span");
  b.id = pill_id;
  b.innerHTML = new_element;

  b.getElementsByClassName(buttonClass.split(" ")[2])[0].addEventListener(
    "click",
    function () {
      call_select(pill_id, pill_value);
    }
  );

  b.getElementsByClassName("aof-remove")[0].addEventListener(
    "click",
    function () {
      call_remove(pill_id, pill_value);
    }
  );

  target_element.appendChild(b);

  call_finish();
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed
  const year = date.getFullYear();

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  const formattedDate = `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  return formattedDate;
}

let loadEvent = async () => {
  document.getElementById("listContract").innerHTML = "<p>carregou</p>";
};

async function changeFinishedDate(endpoint, element, _key) {
  await fetchData(endpoint, "PUT", { _key: _key, finishedDate: element.value });
}

async function changeStartDate(endpoint, element, _key) {
  await fetchData(endpoint, "PUT", { _key: _key, startDate: element.value });
}

const fetchData = async (route, method = "PUT", data = {}) => {
  const url = `${server}${route}`;
  const token = get_property_from_storage("user", "token");

  let config = { method };

  // Se for FormData → não define headers e envia direto
  const isFormData = data instanceof FormData;

  if (isFormData) {
    config.body = data;

    // token no header mesmo usando FormData
    config.headers = {};
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } else {
    // JSON normal
    config.headers = {
      "Content-Type": "application/json",
    };
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.body = JSON.stringify(data);

    if (method === "GET") delete config.body;
  }

  const response = await fetch(url, config);
  return await response.json();
};

const formCopy = async () => {
  function transformJSON(inputJSON) {
    const transformedJSON = {};

    for (const [flatKey, value] of Object.entries(inputJSON)) {
      const parts = flatKey.split(".");
      let current = transformedJSON;

      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!current[p]) current[p] = {};
        current = current[p];
      }

      current[parts[parts.length - 1]] = value;
    }

    return transformedJSON;
  }

  const data = {};

  // 1) aof-input (inclui buttons e inputs únicos)
  const elems = document.getElementsByClassName("aof-input");
  for (let el of elems) {
    const key = el.name || el.id;
    if (!key) continue;

    // 1.a) botão
    if (el.tagName === "BUTTON") {
      // array de vários botões marcados
      if (!data[key]) data[key] = [];
      // usa data-key ou fallback em .value
      const v = el.dataset.key ?? el.value;
      data[key].push(v);
      continue;
    }

    // 1.b) checkbox / radio
    if (el.type === "checkbox" || el.type === "radio") {
      if (!el.checked) continue;
      data[key] = el.value;
      continue;
    }

    // 1.c) demais inputs / selects / textareas
    data[key] = el.value;
  }

  // 2) aof-input-aggregate (colhe múltiplos valores de checkboxes ou similares)
  const aggs = document.getElementsByClassName("aof-input-aggregate");
  for (let el of aggs) {
    const key = el.name || el.id;
    if (!key || !el.checked) continue;
    if (!data[key]) data[key] = [];
    data[key].push(el.value);
  }

  // 3) transforma “flat” em objeto aninhado
  return transformJSON(data);
};

const save = async (route, data) => {
  let method = "PUT";

  // Se for JSON normal, faz sua validação de _key
  if (!(data instanceof FormData)) {
    if (data._key === undefined || data._key == "") {
      delete data._key;
      method = "POST";
    }
  } else {
    // Se for FormData, você decide o método aqui
    method = "POST"; // RECEPTION SEMPRE CRIA
  }

  const resp = await fetchData(route, method, data);
  return resp;
};

const disabledInput = () => {
  let elements = document.getElementsByClassName("aof-input");

  for (let i = 0; i < elements.length; i++) {
    elements[i].disabled = true;
  }

  elements = document.getElementsByClassName("aof-input-aggregate");

  for (let i = 0; i < elements.length; i++) {
    elements[i].disabled = true;
  }
};
