const express = require("express");
const session = require("express-session");
const crypto=require("crypto");
const conn = require("../mysql.js");
const tempRun = express();
const route = express.Router();
const algorithm="sha256"
tempRun.use(session({
    resave: true,
    saveUninitialized: true,
    secret: 'somesecret',
    cookie: { maxAge: 1000 * 60 * 60 }
}))

// Register a Partner Account
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
                    session.TOKEN=crypto.createHash(algorithm).update(req.body.PARTNER_EMAIL+req.body.PARTNER_PASSWORD).digest("hex");
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
        res.send();
    }
    else {
        conn.query("select PARTNER_EMAIL from PARTNER_SECURITY where PARTNER_EMAIL='" + req.body.PARTNER_EMAIL + "';", (err, result) => {
            if (err) { res.end() }
            if (result[0] !== undefined) {
                res.send([{ "PARTNER_EMAIL": "Already exist Email;" }])
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

// Partner Login

route.post("/Login", ((req, res) => {
    console.log(req.body.PARTNER_EMAIL.length);
    if(req.body.PARTNER_EMAIL!==null && req.body.PARTNER_EMAIL!==undefined||req.body.PARTNER_PASSWORD!==null&&req.body.PARTNER_PASSWORD!==undefined)
    conn.query("select * from PARTNER_SECURITY,PARTNER_INFO where PARTNER_EMAIL='" + req.body.PARTNER_EMAIL +
        "' and PARTNER_PASSWORD='" + req.body.PARTNER_PASSWORD +
        "' and PARTNER_SECURITY.PARTNER_ID = PARTNER_INFO.PARTNER_ID and PARTNER_INFO.APP_ID='"+req.body.APP_ID+"';", (err, result) => {
            console.log(result);
            if (err) throw err;
            if (result.length===0) res.end();
            else {
                session.PARTNER_ID = result[0].PARTNER_ID;
                session.PARTNER_NAME = result[0].PARTNER_NAME;
                res.send(JSON.stringify([{
                    PARTNER_ID: session.PARTNER_ID,
                    PARTNER_NAME: session.PARTNER_NAME,
                }]));
            }
        })
    else(
        res.send(JSON.stringify([
            {
                message: "Please Enter Your Password and Your Email"
            }
        ]))
    )
}));

// Check Session

route.get("/Session", (req, res) => {
    console.log(session.PARTNER_NAME);
    if (session.PARTNER_ID === undefined || session.PARTNER_NAME === null ||
        session.PARTNER_ID === null || session.PARTNER_NAME === undefined ||
        session.TOKEN === undefined || session.TOKEN === null) {
        res.send([{ 
            TOKEN: "null",
            PARTNER_ID:"null",
            PARTNER_NAME:"null"
     }]);
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

// Partner log out

route.get("/Logout", (req, res) => {
    session.TOKEN=null;
    session.PARTNER_ID = null;
    session.PARTNER_NAME = null;
    res.end();
})
module.exports = route;