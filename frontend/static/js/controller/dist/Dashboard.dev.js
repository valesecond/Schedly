"use strict";

function updateDashboardView() {
  var toastElList = [].slice.call(document.querySelectorAll('.toast'));
  var toastList = toastElList.map(function (toastEl) {
    return new bootstrap.Toast(toastEl);
  });
  toastList.forEach(function (toast) {
    return toast.show();
  });
  window.highlightSavedRole();
}

function selectUnit(unitKey) {
  console.log("ENTROU NO SELECTUNIT");
  var user = get_property_from_storage("user");
  if (!user || !Array.isArray(user.attendanceUnit)) return;
  var found = user.attendanceUnit.find(function (u) {
    return u._key === unitKey;
  });
  if (!found) return; // Atualiza a unidade ativa na sessão

  user.activeSession = {
    attendanceUnit: found
  };
  set_property_to_storage("user", user); // Verifica se há papel e redireciona

  var listRole = found.list_role;

  if (Array.isArray(listRole) && listRole.length > 0) {
    var role = listRole[0]; // assume o primeiro papel

    window.open("/dashboard/".concat(role), "_self");
  }

  console.log("FUNCIONOU");
}

(function () {
  // Torna a função global
  window.highlightSavedRole = function highlightSavedRole() {
    var selected = localStorage.getItem('selectedRole');
    console.log(selected);
    document.querySelectorAll('.dropdown-item[data-role]').forEach(function (item) {
      if (!item.dataset.originalLabel) {
        item.dataset.originalLabel = item.textContent.trim();
      }

      item.classList.remove('bg-primary', 'text-white');
      item.innerHTML = item.dataset.originalLabel;

      if (item.dataset.role === selected) {
        item.classList.add('bg-primary', 'text-white', 'fw-bold');
        item.innerHTML = "<i class=\"bi bi-check2 me-1\"></i>".concat(item.dataset.originalLabel);
      }
    });
  }; // Intercepta cliques para salvar o perfil


  document.addEventListener('click', function (e) {
    var a = e.target.closest('.dropdown-item[data-role]');
    if (!a) return;
    e.preventDefault();
    var role = a.dataset.role;
    var href = a.getAttribute('href');
    localStorage.setItem('selectedRole', role);
    window.highlightSavedRole();
    setTimeout(function () {
      return window.location = href;
    }, 50);
  });
  document.addEventListener('DOMContentLoaded', window.highlightSavedRole);
})();