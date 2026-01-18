"use strict";

function selectHour(hour, day, month, year) {
  var selectedTime = "".concat(hour, ":00 em ").concat(day, "/").concat(month + 1, "/").concat(year);
  console.log("Hora selecionada: ".concat(selectedTime));
}

function selectDate(day, month, year) {
  console.log("Data selecionada: ".concat(day, "/").concat(month + 1, "/").concat(year));
}

function showListTypeService() {
  var inputElement, searchValue, resultContainer, listFilter, _resultContainer;

  return regeneratorRuntime.async(function showListTypeService$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          console.log(this.doc);
          inputElement = document.getElementById("searchService");

          if (inputElement) {
            _context.next = 5;
            break;
          }

          console.error("Elemento 'searchService' não encontrado.");
          return _context.abrupt("return");

        case 5:
          searchValue = inputElement.value.trim();

          if (!(searchValue === "")) {
            _context.next = 10;
            break;
          }

          resultContainer = document.getElementById("listServiceTypePill");
          if (resultContainer) resultContainer.innerHTML = ""; // Limpa os resultados

          return _context.abrupt("return");

        case 10:
          _context.prev = 10;
          _context.next = 13;
          return regeneratorRuntime.awrap(fetchData("/schedule/service/search", "PUT", {
            name: searchValue
          }));

        case 13:
          listFilter = _context.sent;
          _resultContainer = document.getElementById("listServiceTypePill");

          if (_resultContainer) {
            _context.next = 18;
            break;
          }

          console.error("Contêiner 'listServiceTypePill' não encontrado.");
          return _context.abrupt("return");

        case 18:
          _resultContainer.innerHTML = ""; // Limpa os resultados existentes

          if (Array.isArray(listFilter)) {
            _context.next = 22;
            break;
          }

          alert("Erro ao processar a resposta do servidor.");
          return _context.abrupt("return");

        case 22:
          listFilter.forEach(function (p) {
            insertOnePill("listServiceTypePill", // ID do contêiner
            p._key, // ID único da pill
            p.name, // Nome da pill
            function () {}, // Callback após criar (vazio)
            function (key, value) {
              console.log("Servi\xE7o selecionado: ".concat(key, " - ").concat(value));
            }, function (key, value) {
              console.log("Servi\xE7o removido: ".concat(key, " - ").concat(value));
            }, null // Classe personalizada (deixe como `null` para aplicar as regras internas)
            ); // Configura a pill para ser arrastável

            var pillElement = document.getElementById(p._key);
            var button = pillElement.querySelector(".btn");

            if (button) {
              button.setAttribute("draggable", "true");
              button.addEventListener("dragstart", function (event) {
                event.dataTransfer.setData("text/plain", p._key);
              });
            }
          });
          _context.next = 29;
          break;

        case 25:
          _context.prev = 25;
          _context.t0 = _context["catch"](10);
          console.error("Erro ao buscar serviços:", _context.t0);
          alert("Erro ao carregar os serviços. Por favor, tente novamente.");

        case 29:
        case "end":
          return _context.stop();
      }
    }
  }, null, this, [[10, 25]]);
}

function showListServiceZone() {
  var inputElement, searchValue, resultContainer, listFilter, _resultContainer2;

  return regeneratorRuntime.async(function showListServiceZone$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          console.log(this.doc); // Obtém o elemento de entrada do usuário

          inputElement = document.getElementById("SearchZone");

          if (inputElement) {
            _context2.next = 5;
            break;
          }

          console.error("Elemento 'SearchZone' não encontrado.");
          return _context2.abrupt("return");

        case 5:
          searchValue = inputElement.value.trim(); // Limpa a lista se o valor estiver vazio

          if (!(searchValue === "")) {
            _context2.next = 10;
            break;
          }

          resultContainer = document.getElementById("listServiceZonePill");
          if (resultContainer) resultContainer.innerHTML = ""; // Limpa os resultados

          return _context2.abrupt("return");

        case 10:
          _context2.prev = 10;
          _context2.next = 13;
          return regeneratorRuntime.awrap(fetchData("/schedule/zone/search", "PUT", {
            name: searchValue
          }));

        case 13:
          listFilter = _context2.sent;
          _resultContainer2 = document.getElementById("listServiceZonePill");

          if (_resultContainer2) {
            _context2.next = 18;
            break;
          }

          console.error("Contêiner 'listServiceZonePill' não encontrado.");
          return _context2.abrupt("return");

        case 18:
          _resultContainer2.innerHTML = ""; // Limpa os resultados existentes
          // Verifica se a resposta é válida

          if (Array.isArray(listFilter)) {
            _context2.next = 22;
            break;
          }

          alert("Erro ao processar a resposta do servidor.");
          return _context2.abrupt("return");

        case 22:
          // Adiciona cada resultado ao contêiner
          listFilter.forEach(function (zone) {
            insertOnePill("listServiceZonePill", // ID do contêiner
            zone._key, // ID único da pill
            "".concat(zone.name, " - ").concat(zone.address.way, ", ").concat(zone.address.number), // Exibe nome e endereço
            function () {}, // Callback após criar (vazio)
            function (key, value) {
              console.log("Zona de Servi\xE7o selecionada: ".concat(key, " - ").concat(value));
            }, function (key, value) {
              console.log("Zona de Servi\xE7o removida: ".concat(key, " - ").concat(value));
            }, null // Classe personalizada (deixe como `null` para aplicar as regras internas)
            );
          });
          _context2.next = 29;
          break;

        case 25:
          _context2.prev = 25;
          _context2.t0 = _context2["catch"](10);
          console.error("Erro ao buscar zonas de serviço:", _context2.t0);
          alert("Erro ao buscar as zonas de serviço. Por favor, tente novamente.");

        case 29:
        case "end":
          return _context2.stop();
      }
    }
  }, null, this, [[10, 25]]);
}

document.addEventListener('DOMContentLoaded', function () {
  // Variável global para armazenar o turno selecionado
  var selectedTurn = null; // Função para configurar os botões de turno

  function setupTurnButtons() {
    var turnButtons = document.querySelectorAll('.btn-turno');

    if (turnButtons.length === 0) {
      return;
    } // Adiciona o evento de clique nos botões encontrados


    turnButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        // Remove a classe "ativo" de todos os botões
        turnButtons.forEach(function (b) {
          b.classList.remove('ativo');
        }); // Adiciona a classe "ativo" ao botão clicado

        button.classList.add('ativo'); // Define o turno selecionado com base no botão clicado

        if (button.id === "manha") {
          selectedTurn = 'manha';
        } else if (button.id === "tarde") {
          selectedTurn = 'tarde';
        } else if (button.id === "noite") {
          selectedTurn = 'noite';
        } // Atualiza o calendário com o ícone correspondente


        updateCalendarIcons(); // Exibe o popup

        showPopup(selectedTurn);
      });
    });
  } // Função para atualizar o calendário com o ícone correspondente ao turno


  function updateCalendarIcons() {
    if (!selectedTurn) return; // Se não há turno selecionado, não faz nada

    var calendarDays = document.querySelectorAll('.day-box'); // Remove todos os ícones de forma segura

    calendarDays.forEach(function (day) {
      var icon = day.querySelector('.turn-icon');

      if (icon) {
        icon.remove(); // Removemos o ícone diretamente, sem 'removeChild'
      }
    }); // Define o ícone baseado no turno selecionado

    var iconHTML = '';
    var iconClass = '';

    if (selectedTurn === 'manha') {
      iconHTML = '<i class="fas fa-sun turn-icon"></i>';
      iconClass = 'manha'; // Adiciona a classe de manhã
    } else if (selectedTurn === 'tarde') {
      iconHTML = '<i class="fas fa-sun turn-icon"><i class="fas fa-cloud cloud"></i></i>';
      iconClass = 'tarde'; // Adiciona a classe de tarde
    } else if (selectedTurn === 'noite') {
      iconHTML = '<i class="fas fa-moon turn-icon"></i>';
      iconClass = 'noite'; // Adiciona a classe de noite
    } // Adiciona o ícone ao calendário


    calendarDays.forEach(function (day) {
      if (!day.querySelector('.turn-icon')) {
        // Adiciona o ícone apenas se não houver um já presente
        var iconElement = document.createElement('div');
        iconElement.innerHTML = iconHTML;
        var icon = iconElement.querySelector('.turn-icon');
        icon.classList.add(iconClass); // Adiciona a classe correspondente ao turno

        day.appendChild(iconElement);
      }
    });
  } // Função para exibir o popup


  function showPopup(turn) {
    // Localiza os elementos do popup
    var popup = document.querySelector('.popup-overlay');
    var popupMessage = document.getElementById('popup-message'); // Atualiza a mensagem no popup

    popupMessage.innerHTML = "Voc\xEA selecionou o turno: <strong>".concat(turn, "</strong>."); // Exibe o popup

    popup.style.display = 'flex'; // Configura o botão de fechar

    var closeButton = document.querySelector('.popup-close');
    closeButton.addEventListener('click', function () {
      popup.style.display = 'none';
    }); // Fecha o popup ao clicar fora do conteúdo

    popup.addEventListener('click', function (e) {
      if (e.target === popup) {
        popup.style.display = 'none';
      }
    });
  } // Inicializa a verificação dos botões


  setupTurnButtons(); // Usando MutationObserver para observar mudanças no DOM (caso os botões sejam inseridos dinamicamente)

  var observer = new MutationObserver(function () {
    setupTurnButtons(); // Tenta configurar os botões sempre que o DOM muda
  }); // Configuração para observar todas as mudanças no DOM

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});

function saveSchedule() {
  var data, rep;
  return regeneratorRuntime.async(function saveSchedule$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return regeneratorRuntime.awrap(formCopy());

        case 2:
          data = _context3.sent;
          console.log("Esse é o data:", data);
          _context3.next = 6;
          return regeneratorRuntime.awrap(save("/schedule", data));

        case 6:
          rep = _context3.sent;

        case 7:
        case "end":
          return _context3.stop();
      }
    }
  });
}