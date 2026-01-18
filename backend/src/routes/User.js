const router = require("express").Router();
const db = require("../config/database");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const moment = require("moment-timezone");
const { log } = require("console");

const collName = "User";

// Função para gerar timestamp completo
function generateTimestamp() {
  const now = moment.tz("America/Sao_Paulo");
  return {
    date: now.format("DD/MM/YYYY"),
    datetime: now.toISOString(),
    day: now.format("DD"),
    month: now.format("MM"),
    time: now.format("HH:mm:ss"),
    year: now.format("YYYY"),
  };
}

// Atribui 2FA ao usuário (verifica código OTP)
router.put("/attribute2FA", async (req, res) => {
  const code = req.body.code;
  const secret = req.body.secret;

  const verify = speakeasy.totp.verify({
    secret: secret,
    endcoding: "ascii",
    token: code,
  });

  if (verify) {
    await db.base.query(`UPDATE @user WITH { twoFA: @twoFA } IN ${collName}`, {
      user: req.user,
      twoFA: {
        secret: secret,
        endcoding: "ascii",
      },
    });
    return res.send({ success: true });
  }

  res.status(400).send({ success: false, msg: "Código 2FA inválido." });
});

// Verifica código 2FA do usuário
router.put("/verify2FA", async (req, res) => {
  const code = req.body.code;

  let cursor = await db.base.query(
    `FOR u IN ${collName} FILTER u.name == @user_name RETURN u`,
    { user_name: req.user.name }
  );
  let user = await cursor.next();

  if (!user || !user.twoFA) {
    return res.status(400).send({ verify: false });
  }

  const verify = speakeasy.totp.verify({
    secret: user.twoFA.secret,
    endcoding: "ascii",
    token: code,
  });

  if (verify) {
    return res.send({ verify: true });
  }

  res.send({ verify: false });
});

// Cria segredo 2FA e retorna QR Code + secret ascii
router.put("/create2FA", async (req, res) => {
  const result = speakeasy.generateSecret({
    name: `filanitario-medbase-(${req.user.name})`,
  });

  qrcode.toDataURL(result.otpauth_url, (err, data) => {
    if (err) {
      return res
        .status(500)
        .send({ error: true, msg: "Erro ao gerar QR Code." });
    }
    res.send({ qrcode: data, secret: result.ascii });
  });
});

function encryptPassword(password) {
  let saltAndHash = {};
  saltAndHash.salt = crypto.randomBytes(16).toString("hex");
  saltAndHash.hash = crypto
    .pbkdf2Sync(password, saltAndHash.salt, 1000, 64, `sha512`)
    .toString(`hex`);
  return saltAndHash;
}

function validPassword(password, saltAndHash) {
  let hash = crypto
    .pbkdf2Sync(password, saltAndHash.salt, 1000, 64, `sha512`)
    .toString(`hex`);
  return hash === saltAndHash.hash;
}

router.put("/changePass", async (req, res) => {
  try {
    const { user, new_password } = req.body;

    const user_name = user.person?.name;
    const saltAndHash = encryptPassword(new_password);
    const salt = saltAndHash.salt;
    const hash = saltAndHash.hash;
    const data = { salt, hash };

    const queryResult = await db.base.query(
      `FOR u IN ${collName} FILTER u.person.name == @user_name UPDATE u._key WITH @data IN ${collName} RETURN NEW`,
      { user_name, data }
    );

    console.log("Resultado da atualização:", queryResult);

    res.send({ success: true });
  } catch (err) {
    console.error("🚨 Erro em /changePass:", err);
    res.status(500).send({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const body = req.body;
  const users = Array.isArray(body) ? body : [body]; // permite 1 ou vários

  const results = [];

  for (const user of users) {
    const { email, password, attendanceUnit = [], person } = user;

    if (
      !Array.isArray(attendanceUnit) ||
      attendanceUnit.some((u) => !Array.isArray(u.list_role))
    ) {
      results.push({
        email,
        status: "erro",
        msg: "Formato inválido: cada unidade precisa ter list_role.",
      });
      continue;
    }

    const { salt, hash } = encryptPassword(password);

    const personTemplate = {
      id: person.id,
      name: person.name,
      motherName: person?.motherName || "",
      contact: {
        email: person?.contact?.email || "",
        phone: person?.contact?.phone || "",
      },
      disability: {
        name: person?.disability?.name || "",
      },
      job: {
        name: person?.job?.name || "",
      },
      acs: {
        _key: person?.acs?._key || "",
        name: person?.acs?.name || "",
      },
      esf: {
        _key: person?.esf?._key || "",
        name: person?.esf?.name || "",
      },
      gender: person?.gender || "",
      susCard: person?.susCard || "",
      birthdate: person?.birthdate || "",
      address: {
        property: {
          _key: person?.address?.property?._key || "",
        },
      },
      timestamp: generateTimestamp(),
    };

    let personRef;
    try {
      const personResult = await db.base
        .collection("Person")
        .save(personTemplate);
      personRef = { _key: personResult._key, name: personTemplate.name };
    } catch (err) {
      results.push({ email, status: "erro", msg: "Erro ao salvar pessoa." });
      continue;
    }

    const userData = { email, salt, hash, attendanceUnit, person: personRef };
    if (attendanceUnit.length === 1) {
      userData.activeSession = { attendanceUnit: attendanceUnit[0] };
    } else {
      userData.activeSession = {};
    }

    try {
      const result = await db.base.collection(collName).save(userData);
      results.push({ email, status: "ok", result });
    } catch (err) {
      results.push({ email, status: "erro", msg: "Erro ao salvar usuário." });
    }
  }

  // Se foi apenas 1 usuário, retorna o objeto diretamente
  if (!Array.isArray(body)) {
    return res.status(200).send(results[0]);
  }

  // Se foi lista, retorna o array de resultados
  res.status(200).send(results);
});

async function login(userName, password) {
  let result = { error: false };

  let cursor = await db.base.query(
    `FOR u IN ${collName} FILTER u.person.name == @name RETURN u`,
    { name: userName }
  );
  let user = await cursor.next();

  if (!user) {
    return { msg: "Usuário ou senha inválidos.", error: true };
  }

  let hashCalc = crypto
    .pbkdf2Sync(password, user.salt, 1000, 64, `sha512`)
    .toString(`hex`);
  let valid = hashCalc === user.hash;

  if (!valid) {
    return { error: true };
  }

  let payload = {
    sub: user._key,
    _key: user._key,
    iat: new Date().getTime(),
    name: user.name,
    list_role: user.list_role,
    attendanceUnit: user.activeSession?.attendanceUnit || null,
  };

  let token = jwt.sign(payload, process.env.SECRET_KEY);

  result = {
    token,
    list_role: user.list_role,
    name: user.person.name,
    attendanceUnit: user.activeSession?.attendanceUnit || null,
    timestamp: new Date().toString(),
  };

  await db.base.collection("Login").save(result);
  return result;
}

router.put("/login", async (req, res) => {
  let { person_id, password } = req.body;

  console.log(person_id, password);

  person_id = person_id.replace(/\D/g, "");

  if (!person_id || !password) {
    return res
      .status(400)
      .send({ msg: "CPF e senha são obrigatórios.", error: true });
  }

  // Busca o usuário relacionado ao Person com o CPF
  const query = `
    FOR p IN Person
      FILTER p.id == @person_id
      FOR u IN ${collName}
        FILTER u.person._key == p._key
        RETURN u
  `;

  let cursor = await db.base.query(query, { person_id });
  let user = await cursor.next();

  if (!user) {
    return res
      .status(401)
      .send({ msg: "Usuário ou senha inválidos.", error: true });
  }

  // Verifica a senha
  const hashCalc = crypto
    .pbkdf2Sync(password, user.salt, 1000, 64, "sha512")
    .toString("hex");

  if (hashCalc !== user.hash) {
    return res
      .status(401)
      .send({ msg: "Usuário ou senha inválidos.", error: true });
  }

  // Verifica unidades vinculadas
  const units = user.attendanceUnit || [];
  if (units.length === 0) {
    return res
      .status(403)
      .send({ msg: "Usuário sem unidade física vinculada.", error: true });
  }

  // Define unidade ativa
  const finalUnit = units[0];

  // Atualiza activeSession no banco
  try {
    await db.base.query(
      `UPDATE @key 
       WITH { activeSession: { attendanceUnit: @unitObj } } 
       IN ${collName}`,
      {
        key: user._key,
        unitObj: finalUnit,
      }
    );
  } catch (err) {
    console.error("Erro ao atualizar activeSession:", err);
    return res.status(500).send({ msg: "Erro interno ao fazer login." });
  }

  // Gera payload e token
  const payload = {
    sub: user._key,
    _key: user._key,
    iat: Date.now(),
    name: user.person.name,
    person: user.person,
    attendanceUnit: user.attendanceUnit,
    activeSession: { attendanceUnit: finalUnit },
  };

  const token = jwt.sign(payload, process.env.SECRET_KEY);

  // Monta resposta final
  const result = {
    token,
    sub: user._key,
    iat: Date.now(),
    name: user.person.name,
    person: user.person,
    activeSession: { attendanceUnit: finalUnit },
    attendanceUnit: user.attendanceUnit,
    timestamp: new Date().toString(),
  };

  // Adiciona o campo cpf = person.id para facilitar uso no frontend
  result.person.cpf = person_id;
  console.log("cpf:", result.person.cpf);

  await db.base.collection("Login").save(result);
  return res.send(result);
});

router.put("/validateOldPass", async (req, res) => {
  const { user, oldPassword } = req.body;

  console.log("validateOldPass:", user, oldPassword);

  let result = await login(user.person.name, oldPassword);
  res.send(result);
  console.log("result", result);
});

module.exports = router;
