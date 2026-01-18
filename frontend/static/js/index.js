import Login from "./views/Login.js";
import Schedule from "./views/Schedule.js";
import DashboardManager from "./views/DashboardManager.js";
import Reception from "./views/Reception.js";
import RequestPhase from "./views/RequestPhase.js";
import ListRequestPhase from "./views/ListRequestPhase.js";
import DashboardReceptionist from "./views/DashboardReceptionist.js";
import DashboardScheduler from "./views/DashboardScheduler.js";
import DashboardSchedulerManager from "./views/DashboardSchedulerManager.js";
import ChangePass from "./views/ChangePass.js";
import SchedulingPhase from "./views/SchedulingPhase.js";
import DataScheduling from "./views/DataScheduling.js";
import ViewRequest from "./views/ViewRequest.js";
import ListAwaitingAuthorization from "./views/ListAwaitingAuthorization.js";
import Authorization from "./views/Authorization.js";
import DashboardAttendant from "./views/DashboardAttendant.js";
import ListAwaitingConfirmation from "./views/ListAwaitingConfirmation.js";
import ListAwaitingOncoming from "./views/ListAwaitingOncoming.js";
import Served from "./views/Served.js";
import ReportChoice from "./views/report/ReportChoice.js";
import AnnualRequest from "./views/report/AnnualRequest.js";
import AnnualScheduling from "./views/report/AnnualScheduling.js";
import AnnualAttendant from "./views/report/AnnualAttendant.js";
import ListUnauthorized from "./views/ListUnauthorized.js";
import ReservedPlaces from "./views/ReservedPlaces.js";
import AboutSystem from "./views/AboutSystem.js";
import Proof from "./views/Proof.js";

const pathToRegex = (path) =>
  new RegExp(
    "^" + path.replace(/\//g, "\\/").replace(/:\w+/g, "([^\\/]+)") + "$"
  );

const getParams = (match) => {
  const values = match.result.slice(1);
  const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map(
    (result) => result[1]
  );

  return Object.fromEntries(
    keys.map((key, i) => {
      return [key, values[i]];
    })
  );
};

const navigateTo = (url) => {
  history.pushState(null, null, url);
  router();
};

const router = async () => {
  if (location.pathname === "/") {
    history.replaceState(null, null, "/user/login");
  }
  const routes = [
    { path: "/", view: Login },

    { path: "/reception/new", view: Reception },
    { path: "/reception/:_key", view: Reception },

    { path: "/schedule", view: Schedule },

    { path: "/requestPhase/list", view: ListRequestPhase },
    { path: "/requestPhase/:_key", view: RequestPhase },
    { path: "/viewRequest/:_key", view: ViewRequest },

    { path: "/authorization/:_key", view: Authorization },
    { path: "/proof/:_key", view: Proof },

    { path: "/schedulingPhase", view: SchedulingPhase },
    { path: "/dataScheduling", view: DataScheduling },
    { path: "/scheduling/reserved", view: ReservedPlaces },

    { path: "/authorizationPhase/list", view: ListAwaitingAuthorization },
    { path: "/unauthorizedPhase/list", view: ListUnauthorized },
    { path: "/confirmationPhase/list", view: ListAwaitingConfirmation },
    { path: "/awaiting/list", view: ListAwaitingOncoming },
    { path: "/served/list", view: Served },

    { path: "/user/changePass", view: ChangePass },
    { path: "/user/aboutSystem", view: AboutSystem },

    { path: "/dashboard/manager", view: DashboardManager },
    { path: "/dashboard/receptionist", view: DashboardReceptionist },
    { path: "/dashboard/scheduler", view: DashboardScheduler },
    { path: "/dashboard/schedulerManager", view: DashboardSchedulerManager },
    { path: "/dashboard/attendant", view: DashboardAttendant },

    { path: "/report", view: ReportChoice },
    { path: "/report/annualRequest/:year", view: AnnualRequest },
    { path: "/report/annualScheduling/:year", view: AnnualScheduling },
    { path: "/report/annualAttendant/:year", view: AnnualAttendant },
  ];

  const potentialMatches = routes.map((route) => {
    return {
      route: route,
      result: location.pathname.match(pathToRegex(route.path)),
    };
  });

  let match = potentialMatches.find(
    (potentialMatch) => potentialMatch.result !== null
  );

  if (!match) {
    match = {
      route: routes[0],
      result: [location.pathname],
    };
  }

  const view = new match.route.view(getParams(match));

  await view.init();
  document.querySelector("#menu").innerHTML = await view.getMenu();
  document.querySelector("#app").innerHTML = await view.getHtml();
};

window.addEventListener("popstate", router);

document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", (e) => {
    if (e.target.matches("[data-link]")) {
      e.preventDefault();
      navigateTo(e.currentTarget.href);
    }
  });

  router();
});
