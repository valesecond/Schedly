"use strict";

function showViewScheduling() {
  return regeneratorRuntime.async(function showViewScheduling$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(loadUnitsTree());

        case 2:
          attachTreeHandlers();
          setupDetailAnimations();

        case 4:
        case "end":
          return _context.stop();
      }
    }
  });
} // Carrega unidades e popula a árvore


function loadUnitsTree() {
  var container, units;
  return regeneratorRuntime.async(function loadUnitsTree$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          container = document.getElementById("unitsContainer");

          if (container) {
            _context2.next = 4;
            break;
          }

          console.error("Container #unitsContainer não encontrado.");
          return _context2.abrupt("return");

        case 4:
          _context2.prev = 4;
          _context2.next = 7;
          return regeneratorRuntime.awrap(fetchData("/attendanceUnit/search", "GET"));

        case 7:
          units = _context2.sent;
          container.innerHTML = ""; // limpa antes de popular

          units.forEach(function (unit) {
            // 1) Cria details da Unidade
            var unitDetails = document.createElement("details");
            unitDetails.classList.add("unit-block");
            var unitSummary = document.createElement("summary");
            unitSummary.innerHTML = "\n        <span>".concat(unit.name, "</span>\n        <i class=\"bi bi-chevron-down\"></i>\n      ");
            unitDetails.appendChild(unitSummary); // 2) Container de serviços

            var servicesContainer = document.createElement("ul");
            servicesContainer.classList.add("nested");
            unit.services.forEach(function (svc) {
              if (Array.isArray(svc.types) && svc.types.length) {
                // Serviço com tipos: cria details aninhado
                var svcDetails = document.createElement("details");
                svcDetails.classList.add("service-block");
                var svcSummary = document.createElement("summary");
                svcSummary.innerHTML = "\n            <span>".concat(svc.name, "</span>\n            <i class=\"bi bi-chevron-down\"></i>\n          ");
                svcDetails.appendChild(svcSummary); // Lista de tipos

                var typesUl = document.createElement("ul");
                typesUl.classList.add("nested");
                svc.types.forEach(function (type) {
                  var typeLi = document.createElement("li");
                  typeLi.setAttribute("data-unit", unit._key);
                  typeLi.setAttribute("data-service", svc.key);
                  typeLi.setAttribute("data-type", type.key);
                  typeLi.textContent = type.nome;
                  typesUl.appendChild(typeLi);
                });
                svcDetails.appendChild(typesUl);
                servicesContainer.appendChild(svcDetails);
              } else {
                // Serviço sem tipos: li simples
                var svcLi = document.createElement("li");
                svcLi.setAttribute("data-unit", unit._key);
                svcLi.setAttribute("data-service", svc.key);
                svcLi.textContent = svc.name;
                servicesContainer.appendChild(svcLi);
              }
            });
            unitDetails.appendChild(servicesContainer);
            container.appendChild(unitDetails);
          });
          _context2.next = 16;
          break;

        case 12:
          _context2.prev = 12;
          _context2.t0 = _context2["catch"](4);
          console.error("Erro ao carregar unidades em árvore:", _context2.t0);
          alert("Não foi possível carregar a árvore de unidades.");

        case 16:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[4, 12]]);
} // Anexa handlers para seleção e confirmação


function attachTreeHandlers() {
  document.querySelectorAll(".tree .nested li[data-unit]").forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.stopPropagation();
      document.querySelectorAll(".tree .nested li.active").forEach(function (i) {
        return i.classList.remove("active");
      });
      item.classList.add("active");
      document.getElementById("btnConfirm").disabled = false;
      window.selected = {
        unit: item.dataset.unit,
        service: item.dataset.service
      };
    });
  });
}

function setupDetailAnimations() {
  document.querySelectorAll('.tree details').forEach(function (details) {
    var summary = details.querySelector('summary');
    var content = details.querySelector('ul');
    if (!summary || !content) return; // Estado inicial: oculto ou visível

    content.style.overflow = 'hidden';
    content.style.transformOrigin = 'top';
    content.style.transform = details.open ? 'scaleY(1)' : 'scaleY(0)';
    summary.addEventListener('click', function (e) {
      e.preventDefault();

      if (details.open) {
        // — FECHAR —
        var anim = content.animate([{
          transform: 'scaleY(1)'
        }, {
          transform: 'scaleY(0)'
        }], {
          duration: 400,
          easing: 'ease'
        });

        anim.onfinish = function () {
          details.open = false;
          content.style.transform = 'scaleY(0)';
        };
      } else {
        // — ABRIR —
        // marca como aberto para mostrar conteúdo
        details.open = true; // garante começar de 0

        content.style.transform = 'scaleY(0)';

        var _anim = content.animate([{
          transform: 'scaleY(0)'
        }, {
          transform: 'scaleY(1)'
        }], {
          duration: 600,
          easing: 'ease'
        });

        _anim.onfinish = function () {
          content.style.transform = 'scaleY(1)';
        };
      }
    });
  });
}