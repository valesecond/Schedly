"use strict";

require('dotenv').config();

var express = require('express');

var cors = require('cors');

var util = require("./src/model/Util");

var app = express();

var hubService = require("./src/routes/HubService");

var schedule = require("./src/routes/Schedule");

var user = require("./src/routes/User");

var AttendanceUnit = require("./src/routes/AttendanceUnit");

var Person = require("./src/routes/Person");

var ReceptionPhase = require("./src/routes/ReceptionPhase");

var Way = require("./src/routes/Way");

var City = require("./src/routes/City");

var Neighborhood = require("./src/routes/Neighborhood");

var Receptionist = require("./src/routes/Receptionist");

var Received = require("./src/routes/Received");

var SchedulingPhase = require("./src/routes/SchedulingPhase");

var Acs = require("./src/routes/Acs");

var Esf = require("./src/routes/Esf");

app.use(cors());
app.use(express.json());
app.use(function (req, res, next) {
  console.log("init");
  var regex = /^(?!\/user\/login$).*/;
  var now = new Date();
  var dtl = new Date(now.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo'
  }));
  var month = dtl.getMonth() + 1;
  month = month <= 9 ? "0".concat(month) : month;
  var year = dtl.getFullYear().toString();
  var day = dtl.getDate();
  day = day <= 9 ? "0".concat(day) : day;
  var datetime = "".concat(day, "/").concat(month, "/").concat(year);
  var hour = dtl.getHours();
  hour = hour <= 9 ? "0".concat(hour) : hour;
  var min = dtl.getMinutes();
  min = min <= 9 ? "0".concat(min) : min;
  var seg = dtl.getSeconds();
  seg = seg <= 9 ? "0".concat(seg) : seg;
  var timestamp = {
    day: day,
    month: month,
    year: year,
    time: "".concat(hour, ":").concat(min, ":").concat(seg),
    date: datetime,
    datetime: dtl
  };
  req.body.timestamp = timestamp;

  if (regex.test(req.path)) {
    util.verifyToken(req, res, next);
  } else {
    next();
  }
});
app.use("/hubService", hubService);
app.use("/schedule", schedule);
app.use('/user', user);
app.use('/attendanceUnit', AttendanceUnit);
app.use('/person', Person);
app.use('/reception', ReceptionPhase);
app.use('/receptionist', Receptionist);
app.use('/way', Way);
app.use('/city', City);
app.use('/neighborhood', Neighborhood);
app.use('/received', Received);
app.use('/schedulingPhase', SchedulingPhase);
app.use('/esf', Esf);
app.use('/acs', Acs);
var port = process.env.SERVER_PORT || 6006; // Inicia o servidor Express.js

app.listen(port, function () {
  console.log("Schedule backend rodando na porta ".concat(port));
});