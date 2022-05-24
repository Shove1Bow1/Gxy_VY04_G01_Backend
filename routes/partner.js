const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const conn = require("../mysql.js");
const tempRun = express();
const route = express.Router();
const jwt = require('jsonwebtoken');
var ARRAY_APP_ID = ["PROFILE", "FLIGHT", "HOTEL", "AIRPORT", "APART", "XPERIENCE", "CARRENTAL", "EATS", "VOUCHER", "COMBO"];
let algorithm = "CoTu";
// Get App Id
route.post("/getAppId", (req, res) => {
    if (!req.body.APP_ID) {
        res.end();
    }
    if (ARRAY_APP_ID.includes(req.body.APP_ID)) {
        res.send([{ APP_ID: req.body.APP_ID }]);
    }
    else {
        res.send([{ APP_ID: "Profile" }]);
    }
})
// Register a Partner Account
route.post("/checkEmail",(req,res)=>{
    if (!req.body.PARTNER_EMAIL) {
        res.send({ ERROR: "Điền Email" });
        return;
    }
    conn.query("select PARTNER_EMAIL from PARTNER_SECURITY where PARTNER_EMAIL='" + req.body.PARTNER_EMAIL.toUpperCase() + "';", (err, existEmail) => {
        if (err) {
            res.end();
            return;
        }
        if (existEmail[0]) {
            res.send({ STATUS:false,ERROR: "Email Already Used" })
            return;
        }
    });
})
route.post("/Register", ((req, res) => {
    var numericId;
    console.log(req.body.PARTNER_EMAIL);
   
    conn.query("select COUNT(*) as NUMBER from PARTNER_SECURITY", (err, result) => {
        if (err) {
            res.end();
            return;
        }
        numericId = result[0].NUMBER + 1;
        const PARTNER_ID = 'PAR' + numericId;
        conn.query("insert into PARTNER_INFO(PARTNER_ID,PARTNER_NAME) values ('" + PARTNER_ID + "','" +
            + req.body.PARTNER_NAME + "');"
            , (err, result) => {
                if (err) {
                    res.end();
                    return;
                }
            })
        conn.query("insert into PARTNER_SECURITY(PARTNER_ID,PARTNER_EMAIL,PARTNER_PASSWORD) values ('" + PARTNER_ID +
            "','" + req.body.PARTNER_EMAIL.toUpperCase() +
            "','" + req.body.PARTNER_PASSWORD + "');"
            , (err, result) => {
                if (err) {
                    res.end();
                    return;
                }

            }
        );
        const APP_ID = req.body.APP_ID;
        for (var i = 0; i < APP_ID.length; i++) {
            conn.query("insert into PARTNER_SERVICE (PARTNER_ID,APP_ID) values ('" + PARTNER_ID + "','" + APP_ID[i] + "');", (err, result) => {
                if (err) throw err;
            })
        }
        var PARTNER_PACKAGE = {};
        if (req.body.APP && APP_ID.includes(req.body.APP)) {
            PARTNER_PACKAGE = {
                PARTNER_NAME: result[0].PARTNER_NAME,
                PARTNER_ID: result[0].PARTNER_ID,
                APP_ID: req.app.APP,
            }
        }
        else{
            if (!APP_ID.includes(req.body.APP)&& req.body.APP) {
                res.send({ ERROR: "Tài khoản không đăng ký service này" });
                return;
            }
            else {
                PARTNER_PACKAGE = {
                    PARTNER_NAME: result[0].PARTNER_NAME,
                    PARTNER_ID: result[0].PARTNER_ID,
                    APP_ID: APP_ID,
                }
            }
        } 
        const PARTNER_HASH_PACKAGE = jwt.sign(PARTNER_PACKAGE, algorithm, { expiresIn: "24h" })
        res.send({
            STATUS: true,
            EXPIRED_TIME: 3600 * 24,
            TOKEN: PARTNER_HASH_PACKAGE,
        });
        return;
    })
}))

// Partner Login

route.post("/Login", ((req, res) => {
    if (!req.body.PARTNER_EMAIL) {
        res.send({ ERROR: "Please enter your email" });
        return;
    }
    if (!req.body.PARTNER_PASSWORD) {
        res.send({ ERROR: "Please enter your password" });
        return;
    }
    conn.query("select * from PARTNER_SECURITY,PARTNER_INFO,PARTNER_SERVICE where PARTNER_EMAIL='" +
        req.body.PARTNER_EMAIL.toUpperCase() + "' and PARTNER_PASSWORD='" +
        req.body.PARTNER_PASSWORD + "' and PARTNER_SECURITY.PARTNER_ID=PARTNER_INFO.PARTNER_ID;", (err, result) => {
            if (err) {
                res.end();
                return;
            };
            if (!result[0]) {
                res.send({ ERROR: "Your Password or Email is wrong" });
                return;
            }
            conn.query("select * from PARTNER_SERVICE where PARTNER_ID='" + result[0].PARTNER_ID + "';", (err, resultApp) => {
                var ARRAY_APP_INCLUDE = [];
                if (err) {
                    res.end();
                    return;
                }
                for (var i = 0; i < resultApp.length; i++) {
                    ARRAY_APP_INCLUDE.push(resultApp[i].APP_ID);
                }
                var PARTNER_PACKAGE = {};
                if (req.body.APP && ARRAY_APP_INCLUDE.includes(req.body.APP)) {
                    PARTNER_PACKAGE = {
                        PARTNER_NAME: result[0].PARTNER_NAME,
                        PARTNER_ID: result[0].PARTNER_ID,
                        APP_ID: req.body.APP,
                    }
                }
                else{
                    if (!ARRAY_APP_INCLUDE.includes(req.body.APP)&& req.body.APP) {
                        res.send({ ERROR: "Tài khoản không đăng ký service này" });
                        return;
                    }
                    else {
                        PARTNER_PACKAGE = {
                            PARTNER_NAME: result[0].PARTNER_NAME,
                            PARTNER_ID: result[0].PARTNER_ID,
                            APP_ID: ARRAY_APP_INCLUDE,
                        }
                    }
                } 
                const PARTNER_HASH_PACKAGE = jwt.sign(PARTNER_PACKAGE, algorithm, { expiresIn: "24h" })
                res.send({
                    STATUS: true,
                    TOKEN: PARTNER_HASH_PACKAGE,
                    EXPIRED_TIME: 3600 * 24,
                })
                return;
            })
        }
    )
}));

// Check Session

route.post("/getStatus", (req, res) => {
    if (!req.body.TOKEN) {
        res.send({
            STATUS: false,
        })
    }
    try {
        if (jwt.verify(req.body.TOKEN, algorithm)) {
            res.send({
                STATUS: true,
            })
            return;
        }
    }
    catch (e) {
        res.send({
            STATUS: false,
        });
        return;
    }
})
// Send Partner Info
route.post("/getPartnerInfo", (req, res) => {
    if (!req.body.TOKEN) {
        res.end();
        return;
    }
    try {
        if (jwt.verify(req.body.TOKEN, algorithm)) {
            const DATA = jwt.decode(req.body.TOKEN);
            console.log(DATA);
            res.send(
                {
                    PARTNER_NAME: DATA.PARTNER_NAME,
                    PARTNER_ID: DATA.PARTNER_ID,
                    APP: DATA.APP_ID
                }
            );
            return;
        }
    }
    catch (e) {
        console.log("end");
        res.end();
        return;
    }
})
// insert Transication

module.exports = route;