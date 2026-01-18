function updateDashboardView() {
    var toastElList = [].slice.call(document.querySelectorAll('.toast'))
        var toastList = toastElList.map(function (toastEl) {
            return new bootstrap.Toast(toastEl)
        })
        toastList.forEach(toast => toast.show())
        window.highlightSavedRole();
}

function selectUnit(unitKey) {

  console.log("ENTROU NO SELECTUNIT");
  

  const user = get_property_from_storage("user");
  if (!user || !Array.isArray(user.attendanceUnit)) return;

  const found = user.attendanceUnit.find(u => u._key === unitKey);
  if (!found) return;

  user.activeSession = { attendanceUnit: found };
  set_property_to_storage("user", user);

  const listRole = found.list_role;
  if (Array.isArray(listRole) && listRole.length > 0) {
    const role = listRole[0]; // assume o primeiro papel
    window.open(`/dashboard/${role}`, "_self");
  } 
  console.log("FUNCIONOU");
  
}

(function() {
  window.highlightSavedRole = function highlightSavedRole() {
    const selected = localStorage.getItem('selectedRole');
    document
      .querySelectorAll('.dropdown-item[data-role]')
      .forEach(item => {
        if (!item.dataset.originalLabel) {
          item.dataset.originalLabel = item.textContent.trim();
        }
        item.classList.remove('bg-primary', 'text-white');
        item.innerHTML = item.dataset.originalLabel;
        if (item.dataset.role === selected) {
          item.classList.add('bg-primary', 'text-white', 'fw-bold');
          item.innerHTML = `<i class="bi bi-check2 me-1"></i>${item.dataset.originalLabel}`;
        }
      });
  };

 document.addEventListener('click', e => {
    const a = e.target.closest('.dropdown-item[data-role]');
    if (!a) return;
    e.preventDefault();
    const role = a.dataset.role;
    const href = a.getAttribute('href');
    localStorage.setItem('selectedRole', role);
    setTimeout(() => window.location = href, 50);
  });

  document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('selectedRole')) {
      const first = document.querySelector('.dropdown-item[data-role]');
      if (first) {
        localStorage.setItem('selectedRole', first.dataset.role);
      }
    }
    window.highlightSavedRole();
  });
})();



