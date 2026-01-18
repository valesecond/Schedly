"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports["default"] = void 0;

var _AbstractView2 = _interopRequireDefault(require("./AbstractView.js"));

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function _typeof(obj) {
      return typeof obj;
    };
  } else {
    _typeof = function _typeof(obj) {
      return obj &&
        typeof Symbol === "function" &&
        obj.constructor === Symbol &&
        obj !== Symbol.prototype
        ? "symbol"
        : typeof obj;
    };
  }
  return _typeof(obj);
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function _possibleConstructorReturn(self, call) {
  if (call && (_typeof(call) === "object" || typeof call === "function")) {
    return call;
  }
  return _assertThisInitialized(self);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called"
    );
  }
  return self;
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf
    ? Object.getPrototypeOf
    : function _getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
      };
  return _getPrototypeOf(o);
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: { value: subClass, writable: true, configurable: true },
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf =
    Object.setPrototypeOf ||
    function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };
  return _setPrototypeOf(o, p);
}

var _default =
  /*#__PURE__*/
  (function (_AbstractView) {
    _inherits(_default, _AbstractView);

    function _default(params) {
      var _this;

      _classCallCheck(this, _default);

      _this = _possibleConstructorReturn(
        this,
        _getPrototypeOf(_default).call(this, params)
      );

      _this.setTitle("AgendaSaúde");

      return _this;
    }

    _createClass(_default, [
      {
        key: "init",
        value: function init() {
          return regeneratorRuntime.async(function init$(_context) {
            while (1) {
              switch ((_context.prev = _context.next)) {
                case 0:
                  if (get_property_from_storage("user") == "") {
                    window.open("/user/login", "_self");
                  }

                case 1:
                case "end":
                  return _context.stop();
              }
            }
          });
        },
      },
      {
        key: "getHtml",
        value: function getHtml() {
          var formatCPF, row, user, activeUnitName;
          return regeneratorRuntime.async(function getHtml$(_context2) {
            while (1) {
              switch ((_context2.prev = _context2.next)) {
                case 0:
                  formatCPF = function _ref(cpf) {
                    cpf = cpf.toString().replace(/\D/g, "");
                    return cpf.replace(
                      /(\d{3})(\d{3})(\d{3})(\d{2})/,
                      "$1.$2.$3-$4"
                    );
                  };

                  row = "";
                  user = get_property_from_storage("user"); // Pega o nome da unidade ativa (ou uma mensagem padrão se não existir)

                  activeUnitName =
                    user.activeSession &&
                    user.activeSession.attendanceUnit &&
                    user.activeSession.attendanceUnit.name
                      ? user.activeSession.attendanceUnit.name
                      : "Sem unidade ativa";
                  row +=
                    '\n                \n                <div class="card">\n            <div class="card-header text-center w-100">\n    <strong>Unidade Ativa:</strong> '.concat(
                      activeUnitName,
                      '\n</div>\n\n            <div class="card-body">\n                <!-- Aqui voc\xEA pode inserir o conte\xFAdo principal do dashboard -->\n            </div>\n        </div>\n        <div aria-live="polite" aria-atomic="true" class="d-flex justify-content-center align-items-center w-100">\n            <div role="alert" aria-live="assertive" aria-atomic="true" class="toast" data-bs-autohide="false">\n                <div class="toast-header">\n                    <strong class="me-auto">Usu\xE1rio:</strong>\n                </div>\n                <div class="toast-body">'
                    );
                  row += formatCPF(
                    get_property_from_storage("user").person.cpf
                  );
                  row +=
                    '</div>\n            </div>\n\n            <div role="alert" aria-live="assertive" aria-atomic="true" class="toast" data-bs-autohide="false">\n                <div class="toast-header">                    \n                    <strong class="me-auto">Servidor:</strong>                    \n                </div>\n                <div class="toast-body">';
                  row += get_property_from_storage("user").name;
                  row +=
                    '</div>\n            </div>            \n        </div>\n        <img onload="updateDashboardView()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" >\n';
                  return _context2.abrupt("return", row);

                case 10:
                case "end":
                  return _context2.stop();
              }
            }
          });
        },
      },
      {
        key: "getMenu",
        value: function getMenu() {
          var row;
          return regeneratorRuntime.async(function getMenu$(_context3) {
            while (1) {
              switch ((_context3.prev = _context3.next)) {
                case 0:
                  row =
                    '\n            <ul class="nav nav-tabs justify-content-center">\n                <li class="nav-item">\n                    <a class="nav-link active" href="#">Ao Gestor</a>\n                </li>\n                <li class="nav-item">\n                    <a class="nav-link" href="/report/annualAttendence/'.concat(
                      new Date().getFullYear(),
                      '">Estat\xEDsticas de atendimentos</a>\n                </li>\n            </ul>\n            '
                    );
                  return _context3.abrupt("return", row);

                case 2:
                case "end":
                  return _context3.stop();
              }
            }
          });
        },
      },
    ]);

    return _default;
  })(_AbstractView2["default"]);

exports["default"] = _default;
