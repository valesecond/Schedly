"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _default =
/*#__PURE__*/
function () {
  function _default(params) {
    _classCallCheck(this, _default);

    this.params = params;
    this.user;
    this.list_role = [];
    this.list_role["receptionist"] = "Recepção";
    this.list_role["scheduler"] = "Agendamento";
    this.list_role["schedulerManager"] = "Gestão de Agendas";
    this.list_role["confirmer"] = "Confirmação de Atendimentos";
  }

  _createClass(_default, [{
    key: "setTitle",
    value: function setTitle(title) {
      document.title = title;
    }
  }, {
    key: "getHtml",
    value: function getHtml() {
      return regeneratorRuntime.async(function getHtml$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", "");

            case 1:
            case "end":
              return _context.stop();
          }
        }
      });
    }
  }, {
    key: "init",
    value: function init() {
      return regeneratorRuntime.async(function init$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
            case "end":
              return _context2.stop();
          }
        }
      });
    }
  }, {
    key: "getMenu",
    value: function getMenu() {
      var row = "";
      var user = get_property_from_storage("user");
      console.log("user aqui:", user);

      if (user.attendanceUnit && user.attendanceUnit.length > 1) {
        row += "\n      <li class=\"nav-item dropdown\">\n        <a class=\"nav-link dropdown-toggle\"\n           data-bs-toggle=\"dropdown\"\n           href=\"#\"\n           role=\"button\"\n           aria-expanded=\"false\">\n          Unidades\n        </a>\n        <ul class=\"dropdown-menu\">\n    ";

        for (var i = 0; i < user.attendanceUnit.length; i++) {
          var unit = user.attendanceUnit[i];
          row += "\n        <li>\n          <!-- Ao clicar, chama selectUnit() e recarrega -->\n          <a class=\"dropdown-item\"\n             href=\"#\"\n             onclick=\"selectUnit('".concat(unit._key, "')\">\n            ").concat(unit.name, "\n          </a>\n        </li>\n        <li>\n          <hr class=\"dropdown-divider\">\n        </li>\n      ");
        }

        row += "\n        </ul>\n      </li>\n    ";
      }

      var activeUnit = user.activeSession && user.activeSession.attendanceUnit;

      if (activeUnit && Array.isArray(activeUnit.list_role) && activeUnit.list_role.length > 0) {
        row += "\n  <li class=\"nav-item dropdown\">\n    <a class=\"nav-link dropdown-toggle\"\n       data-bs-toggle=\"dropdown\"\n       href=\"#\"\n       role=\"button\"\n       aria-expanded=\"false\">\n      Perfis\n    </a>\n    <ul class=\"dropdown-menu\">\n  ";
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = activeUnit.list_role[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var role = _step.value;
            row += "\n      <li>\n        <a\n          class=\"dropdown-item\"\n          href=\"/dashboard/".concat(role, "\"\n          data-role=\"").concat(role, "\"\n        >\n          ").concat(this.list_role[role], "\n        </a>\n      </li>\n      <li><hr class=\"dropdown-divider\"></li>\n    ");
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"] != null) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        row += "\n    </ul>\n  </li>\n  ";
      }

      row += "<li class=\"nav-item dropdown\">\n                <a class=\"nav-link dropdown-toggle\" data-bs-toggle=\"dropdown\" href=\"#\" role=\"button\" aria-expanded=\"false\">Usu\xE1rio</a>\n                <ul class=\"dropdown-menu\">\n                    <li><button class=\"dropdown-item\" onclick=\"logoff()\">Sair</button></li>\n                    <li>\n                        <hr class=\"dropdown-divider\">\n                    </li>\n                    <li><a class=\"dropdown-item\" href=\"/user/changePass\">Alterar Senha</a></li>                            \n                </ul>\n            </li>\n";
      return row;
    }
  }, {
    key: "remove_from_buffer",
    value: function remove_from_buffer(key) {
      return regeneratorRuntime.async(function remove_from_buffer$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              window.sessionStorage.removeItem(key);

            case 1:
            case "end":
              return _context3.stop();
          }
        }
      });
    }
  }, {
    key: "preGetHtml",
    value: function preGetHtml() {
      return regeneratorRuntime.async(function preGetHtml$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              return _context4.abrupt("return", "");

            case 1:
            case "end":
              return _context4.stop();
          }
        }
      });
    }
  }]);

  return _default;
}();

exports["default"] = _default;