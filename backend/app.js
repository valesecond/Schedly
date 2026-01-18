require("dotenv").config();
const express = require("express");
const cors = require("cors");

const util = require("./src/model/Util");

const app = express();
const hubService = require("./src/routes/HubService");
const Schedule = require("./src/routes/Schedule");
const user = require("./src/routes/User");
const AttendanceUnit = require("./src/routes/AttendanceUnit");
const Person = require("./src/routes/Person");
const ReceptionPhase = require("./src/routes/ReceptionPhase");
const Way = require("./src/routes/Way");
const City = require("./src/routes/City");
const Neighborhood = require("./src/routes/Neighborhood");
const Receptionist = require("./src/routes/Receptionist");
const InProcess = require("./src/routes/InProcess");
const RequestPhase = require("./src/routes/RequestPhase");
const Acs = require("./src/routes/Acs");
const Esf = require("./src/routes/Esf");
const Service = require("./src/routes/Service");
const RequisitionDetail = require("./src/routes/RequisitionDetail");
const SchedulingPhase = require("./src/routes/SchedulingPhase");
const Specialist = require("./src/routes/Specialist");
const Authorization = require("./src/routes/Authorization");
const Report = require("./src/routes/Report");
const Reserved = require("./src/routes/Reserved");
const PromiseService = require("./src/routes/PromiseService");
const Media = require("./src/routes/Media");
const Proof = require("./src/routes/Proof");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use((req, res, next) => {
  console.log("init");

  const regex = /^(?!\/user\/login$).*/;

  let now = new Date();

  const dtl = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );

  let month = dtl.getMonth() + 1;
  month = month <= 9 ? `0${month}` : month;
  const year = dtl.getFullYear().toString();
  let day = dtl.getDate();
  day = day <= 9 ? `0${day}` : day;

  const datetime = `${day}/${month}/${year}`;

  let hour = dtl.getHours();
  hour = hour <= 9 ? `0${hour}` : hour;
  let min = dtl.getMinutes();
  min = min <= 9 ? `0${min}` : min;
  let seg = dtl.getSeconds();
  seg = seg <= 9 ? `0${seg}` : seg;

  let timestamp = {
    day: day,
    month: month,
    year: year,
    time: `${hour}:${min}:${seg}`,
    date: datetime,
    datetime: dtl,
  };

  req.body.timestamp = timestamp;

  if (regex.test(req.path)) {
    util.verifyToken(req, res, next);
  } else {
    next();
  }
});

app.use("/hubService", hubService);
app.use("/schedule", Schedule);
app.use("/user", user);
app.use("/attendanceUnit", AttendanceUnit);
app.use("/person", Person);
app.use("/reception", ReceptionPhase);
app.use("/receptionist", Receptionist);
app.use("/way", Way);
app.use("/city", City);
app.use("/neighborhood", Neighborhood);
app.use("/inProcess", InProcess);
app.use("/requestPhase", RequestPhase);
app.use("/esf", Esf);
app.use("/acs", Acs);
app.use("/service", Service);
app.use("/detail", RequisitionDetail);
app.use("/schedulingPhase", SchedulingPhase);
app.use("/specialist", Specialist);
app.use("/authorization", Authorization);
app.use("/report", Report);
app.use("/reserved", Reserved);
app.use("/promiseService", PromiseService);
app.use("/media", Media);
app.use("/proof", Proof);

const port = process.env.SERVER_PORT || 6006;
// Inicia o servidor Express.js
app.listen(port, () => {
  console.log(`Schedule backend rodando na porta ${port}`);
});
