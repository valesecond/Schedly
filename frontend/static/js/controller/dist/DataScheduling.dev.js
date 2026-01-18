"use strict";

function showViewDataScheduling() {
  return regeneratorRuntime.async(function showViewDataScheduling$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(loadDataTree());

        case 2:
        case "end":
          return _context.stop();
      }
    }
  });
}

function loadDataTree() {
  var container, classes;
  return regeneratorRuntime.async(function loadDataTree$(_context2) {
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
          return regeneratorRuntime.awrap(fetchData("/inProcess/search/data", "GET"));

        case 7:
          classes = _context2.sent;
          container.innerHTML = "";
          classes.forEach(function (cls) {
            // 1) Cria <details> da classe
            var clsDetails = document.createElement("details");
            clsDetails.classList.add("class-block");
            var clsSummary = document.createElement("summary");
            clsSummary.innerHTML = "\n        <span>".concat(cls.name, "</span>\n        <span class=\"badge bg-primary ms-2\">").concat(cls.pendingCount, "</span>\n        <i class=\"bi bi-chevron-down\"></i>\n      ");
            clsDetails.appendChild(clsSummary); // 2) Lista de tipos (filhos)

            var typesUl = document.createElement("ul");
            typesUl.classList.add("nested");
            cls.types.forEach(function (type) {
              var typeLi = document.createElement("li");
              typeLi.setAttribute("data-service", cls.key);
              typeLi.setAttribute("data-type", type.key);
              typeLi.innerHTML = "\n          <span>".concat(type.nome, "</span>\n          <span class=\"badge bg-secondary ms-2\">").concat(type.pendingCount, "</span>\n        ");
              typesUl.appendChild(typeLi);
            });
            clsDetails.appendChild(typesUl);
            container.appendChild(clsDetails);
          });
          _context2.next = 16;
          break;

        case 12:
          _context2.prev = 12;
          _context2.t0 = _context2["catch"](4);
          console.error("Erro ao carregar classes em árvore:", _context2.t0);
          alert("Não foi possível carregar os dados de InProcess.");

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