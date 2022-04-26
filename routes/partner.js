const express = require("express");
const session = require("express-session");
const conn = require("../mysql.js");
const tempRun = express();
const route = express.Router();
tempRun.use(session({
    resave: true,
    saveUninitialized: true,
    secret: 'somesecret',
    cookie: { maxAge: 1000 * 60 * 60 }
}))

route.post("/Register", ((req, res) => {
    var numericId;
    const getNumericId = (data) => {
        numericId = data;
        console.log(numericId);
        numericId += 1;
        const PARTNER_ID = 'PAR' + numericId;
        console.log(PARTNER_ID);
        if (req.body.PARTNER_NAME === undefined ||
            req.body.PARTNER_NAME === null ||
            req.body.PARTNER_NAME.length === 0 ||
            req.body.APP_ID === undefined ||
            req.body.APP_ID === null) {
            console.log("ending here");
            res.end();
        }
        else {
            conn.query("insert into PARTNER_INFO(PARTNER_ID,APP_ID,PARTNER_NAME) values ('" + PARTNER_ID + "','" +
                req.body.APP_ID + "','" +
                req.body.PARTNER_NAME + "');"
                , (err, result) => {
                    if (err) throw (err);
                })
        }
        if (req.body.PARTNER_EMAIL === null ||
            req.body.PARTNER_EMAIL === undefined ||
            req.body.PARTNER_EMAIL.length === 0 ||
            req.body.PARTNER_PASSWORD === undefined ||
            req.body.PARTNER_PASSWORD === null ||
            req.body.PARTNER_PASSWORD.length === 0) {
            res.end();
        }
        else {
            conn.query("insert into PARTNER_SECURITY(PARTNER_ID,PARTNER_EMAIL,PARTNER_PASSWORD) values ('" + PARTNER_ID +
                "','" + req.body.PARTNER_EMAIL +
                "','" + req.body.PARTNER_PASSWORD + "');"
                , (err, result) => {
                    if (err) throw (err);
                    session.PARTNER_ID = PARTNER_ID;
                    session.PARTNER_NAME = req.body.PARTNER_NAME;
                    res.send([{ "MESSAGE": "Register Success" }]);
                });
        }
    }
    console.log(req.body.PARTNER_EMAIL);
    if (req.body.PARTNER_EMAIL === null ||
        req.body.PARTNER_EMAIL === undefined ||
        req.body.PARTNER_EMAIL.length === 0) {
        res.end();
    }
    else {
        conn.query("select PARTNER_EMAIL from PARTNER_SECURITY where PARTNER_EMAIL='" + req.body.PARTNER_EMAIL + "';", (err, result) => {
            if (err) { res.end() }
            if (result[0] !== undefined) {
                res.send([{ "PARTNER_EMAIL": "Already exist Email;" }])
                res.end();
            }
            else {
                conn.query("select COUNT(*) as NUMBER from PARTNER_SECURITY", (err, result) => {
                    if (err) throw err;
                    console.log(result[0].NUMBER);
                    return getNumericId(result[0].NUMBER);
                })
            }
        });
    }
}))
route.post("/Login", ((req, res) => {
    conn.query("select * from PARTNER_SECURITY,PARTNER_INFO where PARTNER_EMAIL='" + req.body.PARTNER_EMAIL +
        "' and PARTNER_PASSWORD='" + req.body.PARTNER_PASSWORD +
        "' and PARTNER_SECURITY.PARTNER_ID = PARTNER_INFO.PARTNER_ID;", (err, result) => {
            if (err) throw err;
            if (result[0].PARTNER_ID.length === 0) res.end();
            else {
                session.PARTNER_ID = result[0].PARTNER_ID;
                session.PARTNER_NAME = result[0].PARTNER_NAME;
                res.send(JSON.stringify([{
                    PARTNER_ID: session.PARTNER_ID,
                    PARTNER_NAME: session.PARTNER_NAME,
                }]));
            }
        })
}));
route.get("/LoginSession", (req, res) => {
    console.log(session.PARTNER_NAME);
    if (session.PARTNER_ID === undefined || session.PARTNER_NAME === null || session.PARTNER_ID === null || session.PARTNER_NAME === undefined) {
        res.send([{ "message": "Your need to log in" }]);
    }
    else {
        res.send([
            {
                PARTNER_ID: session.PARTNER_ID,
                PARTNER_NAME: session.PARTNER_NAME
            }
        ]);
    }
    res.end();
});
route.get("/Logout", (req, res) => {
    session.PARTNER_ID = null;
    session.PARTNER_NAME = null;
    res.end();
})
module.exports = route;