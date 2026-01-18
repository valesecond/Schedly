"use strict";

function showListMotherNamePill(value) {
  var listFilter;
  return regeneratorRuntime.async(function showListMotherNamePill$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          console.log("showListMotherName");

          if (!(value === "")) {
            _context.next = 3;
            break;
          }

          return _context.abrupt("return");

        case 3:
          _context.next = 5;
          return regeneratorRuntime.awrap(fetchData("/person/search/name", "PUT", {
            name: value
          }));

        case 5:
          listFilter = _context.sent;
          console.log("LIST PERSON");
          console.log(listFilter);
          document.getElementById("listMotherNamePill").innerHTML = "";
          listFilter.data.forEach(function (p) {
            insertOnePill("listMotherNamePill", p.person._key, p.person.motherName, function () {}, function (id, value) {
              updateView(p);
              updateView(p, "person.address.");
              document.getElementById("listMotherNamePill").innerHTML = "";
            }, function (id, value) {});
          });

        case 10:
        case "end":
          return _context.stop();
      }
    }
  });
}

function showListPersonNamePill(value) {
  var listFilter, container;
  return regeneratorRuntime.async(function showListPersonNamePill$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          if (value) {
            _context2.next = 2;
            break;
          }

          return _context2.abrupt("return");

        case 2:
          _context2.next = 4;
          return regeneratorRuntime.awrap(fetchData("/person/search/id", "PUT", {
            id: value
          }));

        case 4:
          listFilter = _context2.sent;
          container = document.getElementById("listPersonNamePill");
          container.innerHTML = "";
          listFilter.data.forEach(function (p) {
            insertOnePill("listPersonNamePill", p.person._key, p.person.name, function () {}, function (id, value) {
              // limpa sugestões
              container.innerHTML = ""; // 1) Preenche tudo de person

              updateView(p.person, "person."); // 2) Preenche tudo de address (property.address)
              //    usando o prefixo exato que está nos seus IDs

              if (p.property && p.property.address) {
                updateView(p.property.address, "person.address.property.address.");
              }
            }, function () {});
          });

        case 8:
        case "end":
          return _context2.stop();
      }
    }
  });
}

function showViewReception() {
  var AttendanceUnit;
  return regeneratorRuntime.async(function showViewReception$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return regeneratorRuntime.awrap(fetchData("/attendanceUnit", "GET"));

        case 2:
          AttendanceUnit = _context3.sent;
          console.log("AttendanceUnit:", AttendanceUnit);
          document.getElementById("person.address.property.address.city._key").value = AttendanceUnit.key;
          document.getElementById("person.address.property.address.city.name").value = AttendanceUnit.name;
          document.getElementById("person.address.property.address.city.state").value = AttendanceUnit.state;

        case 7:
        case "end":
          return _context3.stop();
      }
    }
  });
}

function newReception() {
  var doc, result;
  return regeneratorRuntime.async(function newReception$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          doc = {
            creationDate: new Date()
          };
          _context4.next = 3;
          return regeneratorRuntime.awrap(save("/reception", doc));

        case 3:
          result = _context4.sent;
          return _context4.abrupt("return", result);

        case 5:
        case "end":
          return _context4.stop();
      }
    }
  });
}

function saveUpdateReception() {
  var data, rep;
  return regeneratorRuntime.async(function saveUpdateReception$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          if (!update_error_local()) {
            _context5.next = 2;
            break;
          }

          return _context5.abrupt("return", false);

        case 2:
          _context5.next = 4;
          return regeneratorRuntime.awrap(formCopy());

        case 4:
          data = _context5.sent;
          console.log(data);
          _context5.next = 8;
          return regeneratorRuntime.awrap(fetchData("/reception", "PUT", data));

        case 8:
          rep = _context5.sent;

          if (rep && rep._key) {
            window.open("/reception/ficha/".concat(rep._key), "_self");
          }

        case 10:
        case "end":
          return _context5.stop();
      }
    }
  });
}

function handleClick(button) {
  // Desabilita o botão imediatamente
  button.disabled = true; // Simula o processamento da ação (exemplo: envio de formulário)

  /*    setTimeout(() => {
          alert("Ação concluída!");
          // Habilita o botão novamente, se necessário
          button.disabled = false;
      }, 2000);
      */
}

function saveRequestPhase(element) {
  var form, userPropertyRaw, userProperty, data;
  return regeneratorRuntime.async(function saveRequestPhase$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          console.log("ENTROU NO SAVE");
          _context6.next = 3;
          return regeneratorRuntime.awrap(formCopy());

        case 3:
          form = _context6.sent;
          userPropertyRaw = get_property_from_storage("user");
          userProperty = {
            name: userPropertyRaw.name,
            person: userPropertyRaw.person,
            activeSession: userPropertyRaw.activeSession
          };
          form.userProperty = userProperty;
          data = form;
          _context6.next = 10;
          return regeneratorRuntime.awrap(save("/requestPhase", data));

        case 10:
          console.log("Data:", data);
          window.open("/requestPhase/list", "_self");

        case 12:
        case "end":
          return _context6.stop();
      }
    }
  });
}

var showListEsfPill = function showListEsfPill(value) {
  var listFilter;
  return regeneratorRuntime.async(function showListEsfPill$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          console.log("showListEsfPill");

          if (!(value === "")) {
            _context7.next = 3;
            break;
          }

          return _context7.abrupt("return");

        case 3:
          _context7.next = 5;
          return regeneratorRuntime.awrap(fetchData("/esf/search", "PUT", {
            name: value
          }));

        case 5:
          listFilter = _context7.sent;
          document.getElementById("listEsfPill").innerHTML = "";
          listFilter.forEach(function (p) {
            insertOnePill("listEsfPill", p._key, p.name, function () {}, function (id, value) {
              document.getElementById("person.esf.name").value = value;
              document.getElementById("person.esf._key").value = id;
              document.getElementById("listEsfPill").innerHTML = "";
            });
          });

        case 8:
        case "end":
          return _context7.stop();
      }
    }
  });
};

var showListAcsPill = function showListAcsPill(value) {
  var esf_key, listFilter;
  return regeneratorRuntime.async(function showListAcsPill$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          console.log("showListAcsPill");
          esf_key = document.getElementById("person.esf._key").value;

          if (!(value === "" || esf_key === "")) {
            _context8.next = 4;
            break;
          }

          return _context8.abrupt("return");

        case 4:
          _context8.next = 6;
          return regeneratorRuntime.awrap(fetchData("/acs/search", "PUT", {
            name: value,
            esf_key: esf_key
          }));

        case 6:
          listFilter = _context8.sent;
          document.getElementById("listAcsPill").innerHTML = "";
          listFilter.forEach(function (p) {
            insertOnePill("listAcsPill", p._key, p.name, function () {}, function (id, value) {
              document.getElementById("person.acs.name").value = value;
              document.getElementById("person.acs._key").value = id;
              document.getElementById("listAcsPill").innerHTML = "";
            });
          });

        case 9:
        case "end":
          return _context8.stop();
      }
    }
  });
};

var showListCityPill = function showListCityPill(value) {
  var listFilter;
  return regeneratorRuntime.async(function showListCityPill$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          console.log("showListCityPill");

          if (!(value === "")) {
            _context9.next = 3;
            break;
          }

          return _context9.abrupt("return");

        case 3:
          _context9.next = 5;
          return regeneratorRuntime.awrap(fetchData("/city/search", "PUT", {
            name: value
          }));

        case 5:
          listFilter = _context9.sent;
          document.getElementById("listCityPill").innerHTML = "";
          listFilter.forEach(function (p) {
            insertOnePill("listCityPill", p._key, p.name, function () {}, function (id, value) {
              document.getElementById("person.address.property.address.city.name").value = value;
              document.getElementById("person.address.property.address.city._key").value = id;
              document.getElementById("listCityPill").innerHTML = "";
            });
          });

        case 8:
        case "end":
          return _context9.stop();
      }
    }
  });
};

var showListWayPill = function showListWayPill(value, city_key) {
  var listFilter;
  return regeneratorRuntime.async(function showListWayPill$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          console.log("showListWayPill");

          if (!(value === "")) {
            _context10.next = 3;
            break;
          }

          return _context10.abrupt("return");

        case 3:
          _context10.next = 5;
          return regeneratorRuntime.awrap(fetchData("/way/search", "PUT", {
            city_key: city_key,
            name: value
          }));

        case 5:
          listFilter = _context10.sent;
          document.getElementById("listWayPill").innerHTML = "";
          listFilter.forEach(function (p) {
            insertOnePill("listWayPill", p._key, p.name, function () {}, function (id, value) {
              document.getElementById("person.address.property.address.way.name").value = value;
              document.getElementById("person.address.property.address.way._key").value = id;
              document.getElementById("listWayPill").innerHTML = "";
            });
          });

        case 8:
        case "end":
          return _context10.stop();
      }
    }
  });
};

var showListNeighborhoodPill = function showListNeighborhoodPill(val, city_key) {
  var listFilter;
  return regeneratorRuntime.async(function showListNeighborhoodPill$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          console.log("showListNeighborhoodPill");

          if (!(val === "")) {
            _context11.next = 3;
            break;
          }

          return _context11.abrupt("return");

        case 3:
          _context11.next = 5;
          return regeneratorRuntime.awrap(fetchData("/neighborhood/search", "PUT", {
            city_key: city_key,
            name: val
          }));

        case 5:
          listFilter = _context11.sent;
          document.getElementById("listNeighborhoodPill").innerHTML = "";
          listFilter.forEach(function (p) {
            insertOnePill("listNeighborhoodPill", p._key, p.name, function () {}, function (id, value) {
              document.getElementById("person.address.property.address.neighborhood.name").value = value;
              document.getElementById("person.address.property.address.neighborhood._key").value = id;
              document.getElementById("listNeighborhoodPill").innerHTML = "";
            });
          });

        case 8:
        case "end":
          return _context11.stop();
      }
    }
  });
};

function searchPersonByName(value) {
  var person_property;
  return regeneratorRuntime.async(function searchPersonByName$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          _context12.next = 2;
          return regeneratorRuntime.awrap(fetchData("/person/search/name", "PUT", {
            "id": value
          }));

        case 2:
          person_property = _context12.sent;

          if (person_property.success) {
            person_property = person_property.data;
            updateView(person_property);
            updateView(person_property, "person.address.");
          }

        case 4:
        case "end":
          return _context12.stop();
      }
    }
  });
}

function searchPersonById(value) {
  var person_property;
  return regeneratorRuntime.async(function searchPersonById$(_context13) {
    while (1) {
      switch (_context13.prev = _context13.next) {
        case 0:
          console.log("searchPersonById");
          _context13.next = 3;
          return regeneratorRuntime.awrap(fetchData("/person/search", "PUT", {
            "id": value
          }));

        case 3:
          person_property = _context13.sent;

          if (person_property.success) {
            person_property = person_property.data;
            updateView(person_property);
            updateView(person_property, "person.address.");
          }

        case 5:
        case "end":
          return _context13.stop();
      }
    }
  });
}

function searchPersonByKey(value) {
  var person_property;
  return regeneratorRuntime.async(function searchPersonByKey$(_context14) {
    while (1) {
      switch (_context14.prev = _context14.next) {
        case 0:
          console.log("searchPersonByKey");
          _context14.next = 3;
          return regeneratorRuntime.awrap(fetchData("/person/search", "PUT", {
            "_key": value
          }));

        case 3:
          person_property = _context14.sent;

          if (person_property.success) {
            person_property = person_property.data;
            updateView(person_property);
            updateView(person_property, "person.address.");
          }

        case 5:
        case "end":
          return _context14.stop();
      }
    }
  });
}

function searchPersonBySusCard(element) {
  var person_property;
  return regeneratorRuntime.async(function searchPersonBySusCard$(_context15) {
    while (1) {
      switch (_context15.prev = _context15.next) {
        case 0:
          _context15.next = 2;
          return regeneratorRuntime.awrap(fetchData("/person/search", "PUT", {
            "susCard": element.value
          }));

        case 2:
          person_property = _context15.sent;

          if (person_property.success) {
            person_property = person_property.data;
            updateView(person_property);
            updateView(person_property, "person.address.");
          }

        case 4:
        case "end":
          return _context15.stop();
      }
    }
  });
}