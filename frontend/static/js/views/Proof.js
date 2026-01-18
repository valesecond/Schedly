import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
  result = "No Result";

  constructor(params) {
    super(params);
    this.setTitle("Comprovante de Solicitação de Serviço");

    this.doc = this.getDefaultDoc();
    this.init();
  }

  getDefaultDoc() {
    return {
      _key: "",
      proof: null,
    };
  }

  async getMenu() {
    let row = `
        <ul class="nav nav-tabs justify-content-center">
            <li class="nav-item">
                <a class="nav-link" href="/requestPhase/list">Lista de Atendidos</a>
            </li>
            <li class="nav-item">
                <a class="nav-link active" href="#">Comprovante</a>
            </li>
    `;
    row += super.getMenu();
    row += `</ul>`;
    return row;
  }

  async preGetHtml() {
    return `
      <style>
        .pulse-loader {
          display: flex;
          flex-direction: row; /* horizontal */
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 40px 0;
        }

        .pulse-loader div {
          width: 14px;
          height: 14px;
          background: #0d6efd; /* primary bootstrap */
          border-radius: 50%;
          animation: pulse 0.7s infinite alternate;
        }

        .pulse-loader div:nth-child(1) { animation-delay: 0s; }
        .pulse-loader div:nth-child(2) { animation-delay: 0.2s; }
        .pulse-loader div:nth-child(3) { animation-delay: 0.4s; }

        .pulse-loader p {
          font-size: 1.1rem;
          color: #555;
          margin-left: 12px; /* espaço entre bolinhas e texto */
        }

        @keyframes pulse {
          from { transform: scale(0.6); opacity: 0.6; }
          to   { transform: scale(1.3); opacity: 1; }
        }
      </style>

      <div class="card p-4 text-center">
        <div class="pulse-loader">
          <div></div><div></div><div></div>
        </div>
      </div>
    `;
  }

  async init() {
    if (this.loaded) return;
    this.loaded = true;

    const _key = this.params._key;
    setTimeout(async () => {
      const response = await fetchData(`/proof/${_key}`, "GET");
      this.doc.proof = response.proof;
      document.querySelector("#app").innerHTML = await this.getHtml();
    }, 50);
  }

  async getHtml() {
    if (!this.doc.proof) {
      return `
        <style>
          .pulse-loader {
            display: flex;
            flex-direction: row; /* horizontal */
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 40px 0;
          }

          .pulse-loader div {
            width: 14px;
            height: 14px;
            background: #0d6efd;
            border-radius: 50%;
            animation: pulse 0.7s infinite alternate;
          }

          .pulse-loader div:nth-child(1) { animation-delay: 0s; }
          .pulse-loader div:nth-child(2) { animation-delay: 0.2s; }
          .pulse-loader div:nth-child(3) { animation-delay: 0.4s; }

          .pulse-loader p {
            font-size: 1.1rem;
            color: #555;
            margin-left: 12px;
          }

          @keyframes pulse {
            from { transform: scale(0.6); opacity: 0.6; }
            to   { transform: scale(1.3); opacity: 1; }
          }
        </style>

        <div class="card p-4 text-center">
          <div class="pulse-loader">
            <div></div><div></div><div></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="card">
        <embed
          src="data:application/pdf;base64,${this.doc.proof}"
          type="application/pdf"
          width="100%"
          height="600px"
        />
      </div>
    `;
  }
}
