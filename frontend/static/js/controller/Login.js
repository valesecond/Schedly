async function login() {
  let elements = document.getElementsByClassName("aof-input");

  let data = {};

  for (let i = 0; i < elements.length; i++) {
    let element = elements[i];
    data[element.id] = element.value;
  }

  const resp = await fetchData("/user/login", "PUT", data);

  console.log("resp");
  console.log(resp);
  set_property_to_storage("user", resp);

  if (resp.attendanceUnit[0]?.list_role?.length > 0) {
    const role = resp.attendanceUnit[0].list_role[0];

    window.open(`/dashboard/${role}`, "_self");
  }
}

function formatCPF(input) {
    let value = input.value.replace(/\D/g, "");

    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    if (value.length > 9) {
      value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, "$1.$2.$3-$4");
    } else if (value.length > 6) {
      value = value.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, "$1.$2.$3");
    } else if (value.length > 3) {
      value = value.replace(/^(\d{3})(\d{0,3}).*/, "$1.$2");
    }

    input.value = value;
}


function logoff() {

    window.sessionStorage.clear();
    window.localStorage.clear();

    window.open(`/login`, "_self")

}