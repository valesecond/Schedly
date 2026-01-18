const router = require('express').Router()
const db = require('../config/database')



router.put("/annualRequestCounter", async (req, res) => {
  const year = req.body.year.toString();

  let result = await db.base.query(`
    FOR c IN CounterRequest
      FILTER c._key == @year
      RETURN {
        value: c.value,
        list_specialties: MERGE(
          FOR specName IN ATTRIBUTES(c.list_specialties)
            LET specData = c.list_specialties[specName]
            RETURN {
              [specName]: {
                value: specData.value,
                list_month: specData.list_month  // trazemos o list_month aqui
              }
            }
        )
      }
  `, { year });

  result = await result.next() || { value: 0, list_specialties: {} };
  res.send(result);
});

router.put("/annualSchedulingCounter", async (req, res) => {
  const year = req.body.year.toString();

  let result = await db.base.query(`
    FOR c IN CounterScheduling
      FILTER c._key == @year
      RETURN {
        value: c.value,
        list_month: c.list_month,
        list_statuses: MERGE(
          FOR statusName IN ATTRIBUTES(c.list_statuses)
            LET statusData = c.list_statuses[statusName]
            RETURN {
              [statusName]: {
                value: statusData.value,
                list_month: statusData.list_month
              }
            }
        ),
        list_specialties: MERGE(
          FOR specName IN ATTRIBUTES(c.list_specialties)
            LET specData = c.list_specialties[specName]
            RETURN {
              [specName]: {
                value: specData.value,
                list_month: specData.list_month,
                list_statuses: MERGE(
                  FOR statusName IN ATTRIBUTES(specData.list_statuses)
                    LET statusData = specData.list_statuses[statusName]
                    RETURN {
                      [statusName]: {
                        value: statusData.value,
                        list_month: statusData.list_month
                      }
                    }
                ) 
              }
            }
        )
      }
  `, { year });

  result = await result.next() || { value: 0, list_month: {}, list_statuses: {}, list_specialties: {} };
  res.send(result);
});


router.put("/annualAttendantCounter", async (req, res) => {
  const year = req.body.year.toString();

  let result = await db.base.query(`
    FOR c IN CounterService
      FILTER c._key == @year
      RETURN {
        value: c.value,
        list_month: c.list_month,
        list_specialties: MERGE(
          FOR specName IN ATTRIBUTES(c.list_specialties)
            LET specData = c.list_specialties[specName]
            RETURN {
              [specName]: {
                value: specData.value,
                list_month: specData.list_month
              }
            }
        )
      }
  `, { year });

  result = await result.next() || { 
    value: 0, 
    list_month: {}, 
    list_specialties: {} 
  };

  res.send(result);
});


module.exports = router
