import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  constructor(params) {
    super(params);
    this.setTitle("Agenda");

    this.doc = {
      _key: "",
      attendanceUnit: {
        _key: "",
        name: "",
      },
      specialist: [],
      scheduledDays: [],
      observations: "",
      vacancyLimit: 20,
      service: "",
      serviceType: {
        _key: "",
        name: "",
      },
      period: "manha",
    };

    this.currentDate = new Date();
    this.viewMode = "month";
  }

  async init() {
    if (get_property_from_storage("user") == "") {
      window.open("/user/login", "_self");
    }

    window.schedule = this.doc;
    console.log("AQUI SCHEDULE:", window.schedule);
  }

  changeViewMode(viewMode) {
    this.viewMode = viewMode;

    document.querySelectorAll(".view-button").forEach((button) => {
      button.classList.remove("active");
    });

    if (viewMode === "month") {
      document.getElementById("monthViewButton").classList.add("active");
    } else if (viewMode === "week") {
      document.getElementById("weekViewButton").classList.add("active");
    } else if (viewMode === "day") {
      document.getElementById("dayViewButton").classList.add("active");
    }

    updateCalendar.call(this);
    syncScheduleToForm();
  }

  changePeriod(offset) {
    if (this.viewMode === "month") {
      this.currentDate.setMonth(this.currentDate.getMonth() + offset);
    } else if (this.viewMode === "week") {
      this.currentDate.setDate(this.currentDate.getDate() + offset * 7);
    } else if (this.viewMode === "day") {
      this.currentDate.setDate(this.currentDate.getDate() + offset);
    }
    updateCalendar.call(this);
  }

  goToToday() {
    const now = new Date();

    if (this.viewMode === "month") {
      this.currentDate = new Date(now.getFullYear(), now.getMonth(), 1); // Primeiro dia do mês
      updateCalendar.call(this);

      const todayString = now.toISOString().split("T")[0]; // Formato ISO YYYY-MM-DD
      if (!this.doc.scheduledDays.includes(todayString)) {
        this.doc.scheduledDays.push(todayString);
      }

      const dayBoxes = document.querySelectorAll(".day-box");
      dayBoxes.forEach((dayBox) => {
        if (dayBox.dataset.date === todayString) {
          dayBox.classList.add("selected");
        }
      });
    } else if (this.viewMode === "week") {
      const dayOfWeek = now.getDay();
      this.currentDate = new Date(now);
      this.currentDate.setDate(now.getDate() - dayOfWeek); // Início da semana
      updateCalendar.call(this);
    } else if (this.viewMode === "day") {
      this.currentDate = new Date(now); // Dia atual
      updateCalendar.call(this);
    }
  }

  async getMenu() {
    let row = `
    
            <ul class="nav nav-tabs justify-content-center">
              <li class="nav-item">
                <a class="nav-link" href="/dashboard/schedulerManager">Início</a>
              </li>    
              <li class="nav-item">
                <a class="nav-link active" href="#">Gestão de Agendas</a>
              </li>
            </ul>
        `;
    return row;
  }

  async getHtml() {
    const period = this.doc.period; // pega "manha", "tarde" ou "noite"

    let row = `

  <style>
  
  .day-box.past {
  color: #555;
  border-color: #ddd;
  cursor: not-allowed;
  background: #F1F1F1;
}

.day-box.past:hover {
  transform: none;
}

/* mantém o visual do selecionado igual ao seu */
.day-box.selected {
  outline: 2px solid #007BFF;
  background: rgba(0,123,255,0.08);
}

      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        background: #ffffff;
      }

      .container {
        width: 100%;
        margin: 2rem auto;
      }

      .page-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        color: var(--bs-primary);
        font-size: 2rem;
        font-weight: 600;
        margin-bottom: 1.5rem;
      }

      .page-title .bi {
        font-size: 2.5rem;
        transition: transform 0.3s ease;
      }

      .page-title:hover .bi {
        transform: rotate(20deg) scale(1.1);
      }

      .tree > details {
        position: relative;
        background: #ffffff;
        border-left: 4px solid var(--bs-primary);
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 12px rgba(13, 110, 253, 0.1);
        transition: box-shadow 0.3s, transform 0.3s;
      }
      .tree > details:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(13, 110, 253, 0.15);
      }
      .tree > details > summary {
        border-radius: 0.5rem;

        list-style: none;
        padding: 1.25rem 1.5rem;
        cursor: pointer;

        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 700;
        font-size: 1.125rem;
        background: #ffffff;
      }

      .tree summary::-webkit-details-marker { display: none; }
      .tree summary .bi {
        transition: transform 0.3s, color 0.3s;
        font-size: 1.5rem;
        color: #6c757d;
      }
      .tree details[open] > summary .bi {
        transform: rotate(180deg);
        color: var(--bs-primary);
      }

      .tree details > ul {
        overflow: hidden;
        transform-origin: top;
      }

      .tree details > ul li {
        opacity: 0;
        transition: opacity 0.2s ease 0.1s;
      }
   
      .tree details[open] > ul li {
        opacity: 1;
      }

      .tree .nested {
        list-style: none;
        margin: 0;
        padding-left: 1.5rem;
        padding-bottom: 1rem;
      }
      .tree .nested > details {
        background: #ffffff;
        border-left: 4px solid rgb(7, 124, 42);
        border-radius: 0.375rem;
        margin: 0.5rem 0;
        box-shadow: 0 1px 6px rgba(0,0,0,0.03);
        transition: box-shadow 0.3s, transform 0.3s;
      }
      .tree .nested > details:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(0,0,0,0.05);
      }
      .tree .nested details > summary {
        padding: 0.85rem 1.5rem;
        font-size: 1rem;
        font-weight: 600;
        background: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .tree .nested .nested {
        list-style: none;
        margin: 0;
        padding-left: 3rem;   /* dobra o recuo do nível 2 */
      }

      /* Se você tiver <details> aninhados no nível 3, estilize também: */
      .tree .nested .nested > details {
        background: #ffffff;
        border-left: 4px solid rgb(255, 22, 22);  
        border-radius: 0.3125rem;
        margin: 0.4rem 0;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02);
        transition: box-shadow 0.3s, transform 0.3s;
      }
      .tree .nested .nested > details:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      }

      .tree .nested .nested li[data-unit] {
        position: relative;
        transition: background 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s;
        padding: 0.75rem 1.5rem;
        background: #ffffff;
        margin: 0.3rem 0;
        border-radius: 0.3125rem;
        cursor: pointer;
        font-size: 0.98rem;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-left: 4px solid rgb(3, 20, 255); /* borda mais suave ainda */
      }
      .tree .nested .nested li[data-unit]:hover {
        background: var(--bs-primary); /* azul do Bootstrap */
        color: #ffffff;               /* texto branco */
        transform: translateX(2px);
        box-shadow: 0 2px 6px rgba(13, 110, 253, 0.25);
      }
      .tree .nested .nested li.active {
        background: var(--bs-primary);
        color: #fff;
        box-shadow: inset 3px 0 0 #fff;
        transform: none;
      }    

      .view-button {
        background-color: white; 
        color: #007bff; 
        border: none; 
            padding: 8px 15px;
            cursor: pointer; 
            font-size: 0.9em; 
            font-family: Arial, sans-serif; 
            transition: background-color 0.3s, color 0.3s;
        }

        .slider-container {
            display: flex;
            justify-content: center;
            gap: 20px; 
            margin-top: 20px; 
          }

        .btn-turno {
          background-color: #f0f8ff; 
          color: #007bff;
          padding: 10px 20px;           
          font-size: 1.1em; 
          border-radius: 30px; 
          border: 2px solid #007bff;
          transition: background-color 0.3s, transform 0.2s; 
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-turno i {
          margin-right: 8px;
        }

        .btn-turno:hover {
          background-color: #007bff; /* Fundo azul no hover */
          color: white; /* Texto branco no hover */
          transform: scale(1.05); /* Leve aumento ao passar o mouse */
        }

        .btn-turno.active {
          background-color: #007bff; /* Cor ativa azul */
          color: white; /* Texto branco */
          font-weight: bold; /* Texto em negrito */
        }

        .view-button:hover {
            background-color: #f0f8ff;
        }

        .view-button.active {
            background-color: #007bff;
            color: white;
            font-weight: bold;
        }



        .card {
          background-color: #fff;
          width: 100%;
          border-radius: 10px;
          box-shadow: none;
        }

        /* Flex interno: calendário 80%, especialistas 20% */
        .schedule-container {
          display: flex;
          gap: 1rem;
        }
        .calendar-wrapper {
          flex: 4;  /* 4/5 = 80% */
        }

      .specialists-wrapper {
        flex: 1;               /* 1/5 = 20% */
        border: 1px solid #f9f9f9;
        background: #ffffff;
        border-radius: 0.5rem;
        padding: 1rem;
        max-height: 600px;
        overflow-y: auto;
      }

      /* Itens padrão brancos e texto azul */
      .specialist-item {
        background-color: #ffffff;
        margin-bottom: 0.5rem;
        padding: 0.75rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #007bff;
        transition: background-color 0.2s, color 0.2s, box-shadow 0.2s, border-color 0.2s;
      }

      /* Ícone médico azul por padrão */
      .specialist-item i {
        font-size: 1.3rem;
        color: #007bff;
        transition: color 0.2s;
      }

      /* Enquanto o wrapper estiver com hover, qualquer item que NÃO seja o hovered fica branco */
      .specialists-wrapper:hover .specialist-item:not(:hover):not(.active) {
        background-color: #ffffff;
        color: #007bff;
        border-color: #dee2e6;
        box-shadow: none;
      }

      /* Hover e Active: mesmo estilo */
      .specialist-item:hover,
      .specialist-item.active {
        background-color: #007bff; /* azul primary */
        color: #ffffff;
        border-color: #0056b3;      /* azul mais escuro */
        box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
      }

      /* Ícone branco em hover/active */
      .specialist-item:hover i,
      .specialist-item.active i {
        color: #ffffff;
      }
        /* Calendário e botões (seu CSS existente) */
        #calendar { margin: 0; }
        .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 1.2em; }
        .view-select { display: inline-flex; border: 1px solid #007bff; border-radius: 5px; overflow: hidden; }
        .view-button:hover { background-color: #f0f8ff; }
        .view-button.active { background-color: #007bff; color: white; font-weight: bold; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 10px; padding: 10px; background: #f9f9f9; border-radius: 10px; }
        .day-label { display: flex; justify-content: center; align-items: center; text-align: center; padding: 0; background: #f1f1f1; font-weight: bold; font-size: 0.9em; color: #555; border: 1px solid #ddd; height: 40px; border-radius: 5px; }
        .day-box { position: relative; display: flex; justify-content: center; align-items: center; height: 70px; background: #fff; border: 1px solid #ddd; color: #555; font-size: 1em; border-radius: 5px; transition: background-color 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .day-box:hover { background-color: #007BFF; cursor: pointer; color: #ffffff; font-weight: bold; }
        .day-box.selected { background-color: #007BFF; color: white; border-color: #0056b3; font-weight: bold; transition: all 0.3s ease; }
  
    </style>

    <div class="container">
      <h2 class="page-title">
        <i class="bi bi-calendar3"></i>
        Gestão de Agendas
      </h2>
      <div class="tree" id="unitsContainer"></div>
    </div>

    <div class="card d-none">
      <div class="card-body schedule-container">
        <!-- Calendário -->
        <div class="calendar-wrapper">
          <div id="calendar">
            <div class="calendar-header">
              <div style="display: inline-flex; border-radius: 5px; overflow: hidden;">
                <button id="prevMonthButton" style="background:#007bff;color:#fff;border:none;padding:3px 8px;cursor:pointer;font-size:0.8em;border-top-left-radius:5px;border-bottom-left-radius:5px;margin-left:10px;">
                  &#9664;
                </button>
                <button id="nextMonthButton" style="background:#007bff;color:#fff;border:none;padding:3px 8px;cursor:pointer;font-size:0.8em;border-top-right-radius:5px;border-bottom-right-radius:5px;">
                  &#9654;
                </button>
                <button id="todayButton" style="background:#007bff;color:#fff;border:none;padding:5px 10px;cursor:pointer;font-size:0.8em;border-radius:5px;margin-left:10px;">
                  Hoje
                </button>
              </div>
              <span id="currentMonthYear" style="font-size:1.2em;"></span>
              <div class="view-select">
                <button id="monthViewButton" class="view-button active" onclick="changeViewMode('month')">Mês</button>
                <button id="weekViewButton" class="view-button" onclick="changeViewMode('week')">Semana</button>
                <button id="dayViewButton" class="view-button" onclick="changeViewMode('day')">Dia</button>
              </div>
            </div>
            <div id="calendarGrid" class="calendar-grid"></div>
          </div>
          <div class="slider-container d-flex justify-content-center mt-3">
          <button class="btn btn-turno" id="manha"  value="manha">
            <i class="fas fa-sun"></i> Manhã
          </button>
          <button class="btn btn-turno" id="tarde"  value="tarde">
            <i class="fas fa-cloud-sun"></i> Tarde
          </button>
          <button class="btn btn-turno" id="noite"  value="noite">
            <i class="fas fa-moon"></i> Noite
          </button>
        </div>
        </div>

        <div class="specialists-wrapper">
          <div id="specialistsList">
          </div>
          <div class="mt-4">
            <label for="limitRange"
              class="form-label text-center w-100 text-primary mb-2 fw-400"
              style="font-size: 1.25rem;">
                Limite de Atendimentos:
            </label>
            <div class="text-center mb-2">
              <strong>
                <span id="limitValue" style="color: #007bff; font-size: 1rem; display: inline-block;"></span>
              </strong>
              <span style="color: #007bff; font-size: 1rem;"> por dia</span>
            </div>
              <input
                type="range"
                class="form-range mb-4"
                min="1"
                max="100"
                step="1"
                value="20"
                id="limitRange"
              />
            </div>
          <div>
            <input
              type="text"
              id="observations"
              name="observations"
              class="form-control aof-input"
              value="${this.doc.observations}"
              placeholder="Observações..."
              style="width: 100%; height: 350px;"
            />
              </div>
            </div>
         </div>

        <div class="card-footer">
          <button class="btn btn-primary" style="width:100%;padding:10px;font-size:1em;" onclick="saveSchedule()">Salvar</button>
        </div>
      </div>

      <img style="display:none" onload="showViewSchedule()" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">

    `;

    setTimeout(() => {
      document
        .getElementById("prevMonthButton")
        .addEventListener("click", () => this.changePeriod(-1));
      document
        .getElementById("nextMonthButton")
        .addEventListener("click", () => this.changePeriod(1));
      document
        .getElementById("todayButton")
        .addEventListener("click", () => this.goToToday());

      document
        .getElementById("monthViewButton")
        .addEventListener("click", () => this.changeViewMode("month"));
      document
        .getElementById("weekViewButton")
        .addEventListener("click", () => this.changeViewMode("week"));
      document
        .getElementById("dayViewButton")
        .addEventListener("click", () => this.changeViewMode("day"));

      updateCalendar.call(this);
      initLimitSlider();
      initPeriodButtons();
    }, 0);

    return row;
  }
}
