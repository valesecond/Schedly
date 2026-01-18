async function showListMotherNamePill(value) {
  console.log("showListMotherName");

  if (value === "") {
    return;
  }

  const listFilter = await fetchData(`/person/search/name`, "PUT", {
    name: value,
  });

  console.log("LIST PERSON");

  console.log(listFilter);
  document.getElementById("listMotherNamePill").innerHTML = "";
  listFilter.data.forEach((p) => {
    insertOnePill(
      "listMotherNamePill",
      p.person._key,
      p.person.motherName,
      () => {},
      (id, value) => {
        updateView(p);
        updateView(p, "person.address.");

        document.getElementById("listMotherNamePill").innerHTML = "";
      },
      (id, value) => {}
    );
  });
}

async function showListPersonNamePill(value) {
  if (!value) return;

  const listFilter = await fetchData(`/person/search/id`, "PUT", { id: value });
  const container = document.getElementById("listPersonNamePill");
  container.innerHTML = "";

  listFilter.data.forEach((p) => {
    insertOnePill(
      "listPersonNamePill",
      p.person._key,
      p.person.name,
      () => {},
      (id, value) => {
        container.innerHTML = "";

        updateView(p.person, "person.");

        if (p.property && p.property.address) {
          updateView(p.property.address, "person.address.property.address.");
        }

        const ele = document.getElementById("person.id");
        if (ele) {
          ele.className = ele.className.replaceAll(" is-invalid", "");
        }
      },
      () => {}
    );
  });
}

// Alterna visualização do bloco
function toggleDoc(sectionId) {
  const body = document.getElementById(sectionId);
  body.style.display = body.style.display === "block" ? "none" : "block";

  const btn = document.getElementById(sectionId + "_btn");
  if (btn) {
    btn.innerText = body.style.display === "block" ? "Ocultar" : "Visualizar";
  }
}

function initDocumentUploads(existingDocs = {}) {
  window.receptionDoc = window.receptionDoc || {};
  window.receptionDoc.person = window.receptionDoc.person || {};
  window.receptionDoc.person.files = window.receptionDoc.person.files || {};

  const inputs = document.querySelectorAll(".doc-input");

  inputs.forEach((input) => {
    const previewId = input.dataset.preview;
    const sectionId = previewId.replace("preview_", "doc_");
    const cardBody = document.getElementById(sectionId);
    const btn = document.getElementById(sectionId + "_btn");
    const statusIndicator = document.getElementById(sectionId + "_status");
    const previewBox = document.getElementById(previewId);
    const wrapper = document.getElementById(previewId + "_wrapper");

    previewBox.innerHTML = "";

    // Estado inicial
    if (existingDocs[sectionId] === true) {
      wrapper.style.display = "none";
      cardBody.style.display = "none";

      btn.style.display = "inline-block";
      btn.innerText = "Visualizar";

      statusIndicator.style.display = "inline-block";
      statusIndicator.innerText = "Documento anexado";
      statusIndicator.style.marginRight = "12px";
    } else {
      cardBody.style.display = "block";
      btn.style.display = "none";
      statusIndicator.style.display = "none";
    }

    // 🔥 REMOVE O EVENT LISTENER ANTERIOR
    if (input._handler) {
      input.removeEventListener("change", input._handler);
    }

    // 🔥 CRIA UM HANDLER NOVO
    input._handler = () => {
      previewBox.innerHTML = "";

      if (input.files.length === 0) {
        window.receptionDoc.person.files[input.name] = null;

        wrapper.style.display = "none";
        btn.style.display = "none";
        statusIndicator.style.display = "none";
        return;
      }

      // Salva na estrutura
      if (input.multiple) {
        window.receptionDoc.person.files[input.name] = [...input.files];
      } else {
        window.receptionDoc.person.files[input.name] = input.files[0];
      }

      btn.style.display = "inline-block";
      statusIndicator.style.display = "inline-block";
      statusIndicator.innerText = "Documento anexado";
      wrapper.style.display = "block";

      [...input.files].forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target.result;

          if (file.type.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = url;
            img.classList.add("preview-image");
            previewBox.appendChild(img);
          } else if (file.type === "application/pdf") {
            const pdf = document.createElement("embed");
            pdf.src = url;
            pdf.type = "application/pdf";
            pdf.classList.add("preview-pdf");
            previewBox.appendChild(pdf);
          }
        };
        reader.readAsDataURL(file);
      });
    };

    // 🔥 ADICIONA O EVENT LISTENER NOVO
    input.addEventListener("change", input._handler);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initDocumentUploads({
    doc_identidade: false,
    doc_residencia: false,
    doc_sus: false,
    doc_laudos: false,
  });
});

async function showViewReception() {
  const AttendanceUnit = await fetchData(`/attendanceUnit`, "GET");
  console.log("AttendanceUnit:", AttendanceUnit);

  document.getElementById("person.address.property.address.city._key").value =
    AttendanceUnit.key;
  document.getElementById("person.address.property.address.city.name").value =
    AttendanceUnit.name;
  document.getElementById("person.address.property.address.city.state").value =
    AttendanceUnit.state;

  initDocumentUploads();
}

async function newReception() {
  let doc = {
    creationDate: new Date(),
  };

  const result = await save("/reception", doc);

  return result;
}

async function saveUpdateReception() {
  if (update_error_local()) {
    return false;
  }

  const data = await formCopy();

  console.log(data);

  const rep = await fetchData("/reception", "PUT", data);

  if (rep && rep._key) {
    window.open(`/reception/ficha/${rep._key}`, "_self");
  }
}

function handleClick(button) {
  // Desabilita o botão imediatamente
  button.disabled = true;

  // Simula o processamento da ação (exemplo: envio de formulário)
  /*    setTimeout(() => {
        alert("Ação concluída!");
        // Habilita o botão novamente, se necessário
        button.disabled = false;
    }, 2000);
    */
}

async function saveReception(element) {
  if (update_error_local()) return false;

  handleClick(element);

  const form = await formCopy();

  const userRaw = get_property_from_storage("user");

  const userProperty = {
    iat: userRaw.iat,
    _key: userRaw.sub,
    name: userRaw.person.name,
    person: userRaw.person,
    activeSession: userRaw.activeSession,
  };

  form.userProperty = userProperty;

  const fd = new FormData();
  fd.append("json", JSON.stringify(form));

  console.log("fd:", fd);

  console.log("Arquivos:", window.receptionDoc.person.files);
  if (window.receptionDoc?.person?.files) {
    for (const [name, file] of Object.entries(
      window.receptionDoc.person.files
    )) {
      if (!file) continue;

      if (Array.isArray(file)) {
        file.forEach((f) => fd.append(name, f));
      } else {
        fd.append(name, file);
      }
    }
  }

  // usa seu save() normalmente
  const rep = await save("/reception", fd);

  const keyToUse = window.receptionDoc?.lastInProcessKey || rep?._key;

  if (keyToUse) {
    window.open(`/requestPhase/${keyToUse}`, "_self");
  }
}

function normalizeString(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const showListEsfPill = async (value) => {
  console.log("showListEsfPill");

  if (value === "") {
    return;
  }

  const listFilter = await fetchData(`/esf/search`, "PUT", { name: value });

  document.getElementById("listEsfPill").innerHTML = "";

  listFilter.forEach((p) => {
    insertOnePill(
      "listEsfPill",
      p._key,
      p.name,
      () => {},
      (id, value) => {
        document.getElementById("person.esf.name").value = value;
        document.getElementById("person.esf._key").value = id;
        document.getElementById("listEsfPill").innerHTML = "";
      }
    );
  });

  const hiddenKey = document.getElementById("person.esf._key");
  const input = document.getElementById("person.esf.name");

  if (
    listFilter.length > 0 &&
    normalizeString(input.value) === normalizeString(listFilter[0].name)
  ) {
    hiddenKey.value = listFilter[0]._key;
  } else {
    hiddenKey.value = "";
  }
};

const showListAcsPill = async (value) => {
  console.log("showListAcsPill");

  const esf_key = document.getElementById("person.esf._key").value;
  if (value === "" || esf_key === "") {
    return;
  }

  const listFilter = await fetchData(`/acs/search`, "PUT", {
    name: value,
    esf_key: esf_key,
  });

  document.getElementById("listAcsPill").innerHTML = "";

  listFilter.forEach((p) => {
    insertOnePill(
      "listAcsPill",
      p._key,
      p.name,
      () => {},
      (id, value) => {
        document.getElementById("person.acs.name").value = value;
        document.getElementById("person.acs._key").value = id;
        document.getElementById("listAcsPill").innerHTML = "";
      }
    );
  });

  // Verificação para preencher o _key se o valor for exato
  const hiddenKey = document.getElementById("person.acs._key");
  const input = document.getElementById("person.acs.name");

  if (
    listFilter.length > 0 &&
    normalizeString(input.value) === normalizeString(listFilter[0].name)
  ) {
    hiddenKey.value = listFilter[0]._key;
  } else {
    hiddenKey.value = "";
  }
};

document.addEventListener("click", (event) => {
  const inputEsf = document.getElementById("person.esf.name");
  const listEsf = document.getElementById("listEsfPill");

  if (
    inputEsf &&
    listEsf &&
    !inputEsf.contains(event.target) &&
    !listEsf.contains(event.target)
  ) {
    listEsf.innerHTML = "";
  }
});

// ACS
document.addEventListener("click", (event) => {
  const inputAcs = document.getElementById("person.acs.name");
  const listAcs = document.getElementById("listAcsPill");

  if (
    inputAcs &&
    listAcs &&
    !inputAcs.contains(event.target) &&
    !listAcs.contains(event.target)
  ) {
    listAcs.innerHTML = "";
  }
});

const showListCityPill = async (value) => {
  console.log("showListCityPill");

  if (value === "") return;

  const inputCity = document.getElementById(
    "person.address.property.address.city.name"
  );
  const listContainer = document.getElementById("listCityPill");
  const hiddenKey = document.getElementById(
    "person.address.property.address.city._key"
  );

  const listFilter = await fetchData(`/city/search`, "PUT", {
    name: value,
  });

  listContainer.innerHTML = "";

  listFilter.forEach((p) => {
    insertOnePill(
      "listCityPill",
      p._key,
      p.name,
      () => {},
      (id, val) => {
        inputCity.value = val;
        hiddenKey.value = id;
        listContainer.innerHTML = "";
      }
    );
  });

  const normalizeText = (text) =>
    text
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  if (
    listFilter.length > 0 &&
    normalizeText(value) === normalizeText(listFilter[0].name)
  ) {
    hiddenKey.value = listFilter[0]._key;
  } else {
    hiddenKey.value = "";
  }
};

document.addEventListener("click", (event) => {
  const inputCity = document.getElementById(
    "person.address.property.address.city.name"
  );
  const listContainer = document.getElementById("listCityPill");

  if (!inputCity || !listContainer) return;

  if (
    !inputCity.contains(event.target) &&
    !listContainer.contains(event.target)
  ) {
    listContainer.innerHTML = "";
  }
});

const showListWayPill = async (value, city_key) => {
  if (value === "") return;

  const inputWay = document.getElementById(
    "person.address.property.address.way.name"
  );
  const listContainer = document.getElementById("listWayPill");
  const hiddenKey = document.getElementById(
    "person.address.property.address.way._key"
  );

  const listFilter = await fetchData(`/way/search`, "PUT", {
    city_key,
    name: value,
  });

  listContainer.innerHTML = "";

  listFilter.forEach((p) => {
    insertOnePill(
      "listWayPill",
      p._key,
      p.name,
      () => {},
      (id, val) => {
        inputWay.value = val;
        hiddenKey.value = id;
        listContainer.innerHTML = "";
      }
    );
  });

  // Verificação adicional igual à do bairro
  const val = value;
  if (
    listFilter.length > 0 &&
    val.trim().toLowerCase() === listFilter[0].name.trim().toLowerCase()
  ) {
    hiddenKey.value = listFilter[0]._key;
  } else {
    hiddenKey.value = "";
  }
};

document.addEventListener("click", (event) => {
  const inputWay = document.getElementById(
    "person.address.property.address.way.name"
  );
  const listContainer = document.getElementById("listWayPill");

  if (!inputWay || !listContainer) return;

  if (
    !inputWay.contains(event.target) &&
    !listContainer.contains(event.target)
  ) {
    listContainer.innerHTML = "";
  }
});

const showListNeighborhoodPill = async (val, city_key) => {
  if (val === "") return;

  const inputNeighborhood = document.getElementById(
    "person.address.property.address.neighborhood.name"
  );
  const listContainer = document.getElementById("listNeighborhoodPill");
  const hiddenKey = document.getElementById(
    "person.address.property.address.neighborhood._key"
  );

  const listFilter = await fetchData(`/neighborhood/search`, "PUT", {
    city_key,
    name: val,
  });

  listContainer.innerHTML = "";

  if (
    listFilter.length > 0 &&
    val.trim().length === listFilter[0].name.length
  ) {
    hiddenKey.value = listFilter[0]._key;
  } else {
    hiddenKey.value = "";
  }

  listFilter.forEach((p) => {
    insertOnePill(
      "listNeighborhoodPill",
      p._key,
      p.name,
      () => {},
      (id, value) => {
        inputNeighborhood.value = value;
        hiddenKey.value = id;
        listContainer.innerHTML = "";
      }
    );
  });
};

document.addEventListener("click", (event) => {
  const inputNeighborhood = document.getElementById(
    "person.address.property.address.neighborhood.name"
  );
  const listContainer = document.getElementById("listNeighborhoodPill");

  if (!inputNeighborhood || !listContainer) return;

  if (
    !inputNeighborhood.contains(event.target) &&
    !listContainer.contains(event.target)
  ) {
    listContainer.innerHTML = "";
  }
});

async function searchPersonByName(value) {
  let person_property = await fetchData(`/person/search/name`, "PUT", {
    id: value,
  });

  if (person_property.success) {
    person_property = person_property.data;

    updateView(person_property);
    updateView(person_property, "person.address.");
  }
}

async function searchPersonById(value) {
  console.log("searchPersonById");

  let person_property = await fetchData(`/person/search`, "PUT", { id: value });

  if (person_property.success) {
    person_property = person_property.data;

    updateView(person_property);
    updateView(person_property, "person.address.");
  }
}

async function searchPersonByKey(value) {
  console.log("searchPersonByKey");

  let person_property = await fetchData(`/person/search`, "PUT", {
    _key: value,
  });

  if (person_property.success) {
    person_property = person_property.data;

    updateView(person_property);
    updateView(person_property, "person.address.");
  }
}

async function searchPersonBySusCard(element) {
  let person_property = await fetchData(`/person/search`, "PUT", {
    susCard: element.value,
  });

  if (person_property.success) {
    person_property = person_property.data;

    updateView(person_property);
    updateView(person_property, "person.address.");
  }
}
