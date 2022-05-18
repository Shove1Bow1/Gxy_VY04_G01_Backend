
var express = require('express');
const router = express.Router();
const session = require('express-session');
const tempRun = express();
const con = require('../mysql');
const stripe = require('../stripe');
const crypto = require("crypto");
const e = require('express');
const { stringify } = require('querystring');
var http = require('http');
const axios = require('axios');
const { profile } = require('console');
const { response } = require('express');
var ARRAY_APP_ID = ["PROFILE", "FLIGHT", "HOTEL", "AIRPORT", "APART", "XPERIENCE", "CARRENTAL", "EATS", "VOUCHER", "COMBO"];
let algorithm = "sha256";

router.post("/create-payment-intent", async (req, res) => {
    const items = 3000;
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
        amount: calculateOrderAmount(items),
        currency: "usd",

        automatic_payment_methods: {
            enabled: true,

        },
    });

    console.log(paymentIntent.client_secret);
    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});
const calculateOrderAmount = (items) => {
    // Replace this constant with a calculation of the order's amount
    // Calculate the order total on the server to prevent
    // people from directly manipulating the amount on the client
    return 1400;
};
////
//// CUSTOMER 
////
//Register
router.post("/Register", async (req, res) => {
    var numericId;
    if (req.body.CUSTOMER_EMAIL) {
        con.query("select CUSTOMER_EMAIL from CUSTOMER_SECURITY where CUSTOMER_EMAIL='" +
            req.body.CUSTOMER_EMAIL + "';", (err, result) => {
                console.log(result);
                if (err) {
                    res.send(err)
                }
                else {
                    if (result[0] !== undefined) {
                        res.send([{ ERROR: "Email Is Being Used;" }])
                    }
                    else {
                        if (!req.body.PHONE_NUM) {
                            con.query("select COUNT(*) as NUMBER from CUSTOMER_SECURITY", (err, result) => {
                                if (err) throw err;
                                console.log(result[0].NUMBER);
                                numericId = result[0].NUMBER;
                                console.log(numericId);
                                numericId += 1;
                                const CUSTOMER_ID = 'CUS' + numericId;
                                console.log(CUSTOMER_ID);
                                console.log(req.body.CUSTOMER_NAME);
                                con.query("insert into CUSTOMER_INFO(CUSTOMER_ID,FULL_NAME,GENDER,DATE_OF_BIRTH,POINT_AVAILABLE) values ('" +
                                    CUSTOMER_ID + "','" +
                                    req.body.CUSTOMER_NAME + "','" +
                                    req.body.GENDER + "','" +
                                    req.body.BIRTHDAY + "',0);"
                                    , (err, result) => {
                                        if (err) throw (err);
                                    })
                                con.query("insert into CUSTOMER_SECURITY(CUSTOMER_ID,CUSTOMER_EMAIL,CUS_PASSWORD) values ('" +
                                    CUSTOMER_ID + "','" +
                                    req.body.CUSTOMER_EMAIL.toUpperCase() +
                                    "','" + req.body.CUS_PASSWORD + "');"
                                    , (err, result) => {
                                        if (err) console.log(err);
                                        const TOKEN = crypto.createHash(algorithm).update(req.body.CUS_PASSWORD + req.body.CUSTOMER_EMAIL.toUpperCase()).digest("hex");
                                        res.send([{
                                            STATUS: true,
                                            CUSTOMER_ID: CUSTOMER_ID,
                                            CUSTOMER_TOKEN: TOKEN,
                                            EXPIRED_TIME: 3600 * 24 * 7,
                                        }])
                                    })
                                console.log("finish");
                            })
                        }
                        else {
                        }
                    }
                }
            })
    }
    else {
        res.send({ "message": "enter your email" })
    }
})
//LOGIN USING EMAIL
router.post("/LoginEmail", (req, res) => {
    if (!req.body.CUSTOMER_EMAIL) {
        res.send([{ ERROR: "Please type in Your Email" }]);
    }
    else {
        if (!req.body.CUS_PASSWORD) {
            res.send([{ ERROR: "please type in Your Password" }]);
        }
        else {
            con.query(
                "select * from CUSTOMER_SECURITY,CUSTOMER_INFO where CUSTOMER_EMAIL='" + req.body.CUSTOMER_EMAIL
                + "' and CUS_PASSWORD = '" + req.body.CUS_PASSWORD
                + "' and CUSTOMER_SECURITY.CUSTOMER_ID=CUSTOMER_INFO.CUSTOMER_ID;", (err, result) => {
                    if (err) throw err;
                    if (!result) { res.send("Please reenter your Account"); }
                    else {
                   
                        const TOKEN = crypto.createHash(algorithm).update(req.body.CUS_PASSWORD + req.body.CUSTOMER_EMAIL).digest("hex");     
                       
                        const BackData =
                            [
                                {
                                    STATUS: true,
                                    CUSTOMER_ID: result[0].CUSTOMER_ID,
                                    CUSTOMER_TOKEN: TOKEN,
                                    EXPIRED_TIME: 3600 * 24 * 7,
                                }
                            ]; 
                        console.log(BackData);
                        res.send(JSON.stringify(BackData));
                    }
                })
        }
    }
})
//LOGIN USING Phone Number
router.post("/LoginPhoneNumber", (req, res) => {

})
// get app id
router.post("/getAppId", (req, res) => {
    if (ARRAY_APP_ID.includes(req.body.APP_ID)) {
        res.send([{ APP_ID: req.body.APP_ID }]);
    }
    else {
        res.send([{ APP_ID: "PROFILE" }]);
    }
})
// send Account info
router.post(`/getUserInfo`, (req, res) => {
    if (!req.body.CUSTOMER_ID) {
        console.log("here is not the info");
        res.end();
    }
    else {
        if (!req.body.CUSTOMER_TOKEN) {
            res.send([{ ERROR: "YOU DON'T HAVE A TOKEN TO ACCESS THIS DATA" }]);
        }
        else {
            console.log(req.body.APP_ID)
            if (ARRAY_APP_ID.includes(req.body.APP_ID)) {
                con.query("select * from CUSTOMER_SECURITY,CUSTOMER_INFO where CUSTOMER_SECURITY.CUSTOMER_ID=CUSTOMER_INFO.CUSTOMER_ID and CUSTOMER_SECURITY.CUSTOMER_ID='" + req.body.CUSTOMER_ID + "';", (err, result) => {
                    if (err) throw (err);
                    console.log("here the info");
                    const TOKEN = crypto.createHash(algorithm).update(result[0].CUS_PASSWORD + result[0].CUSTOMER_EMAIL).digest("hex");
                    const CUSTOMER_TOKEN = req.body.CUSTOMER_TOKEN;
                    console.log(TOKEN);
                    var Year = null, Month = null, Day = null;
                    const BIRTHDAY = stringify(result[0].CUSTOMER_BIRTHDAY);
                    if (BIRTHDAY.length > 8) {
                        for (var i = 0; i < BIRTHDAY.length; i++) {
                            if (i < 4) {
                                Year += data.data[0].CUSTOMER_BIRTHDAY[i];
                            }
                            if (i > 4 && i < 7) {
                                Month += data.data[0].CUSTOMER_BIRTHDAY[i];
                            }
                            if (i > 7 && i < 10) {
                                Day += data.data[0].CUSTOMER_BIRTHDAY[i]
                            }
                            if (i > 10) {
                                break;
                            }
                        }
                    }
                    const CUSTOMER_INFO_PACKAGE = [{
                        CUSTOMER_NAME: req.body.CUSTOMER_NAME || null,
                        CUSTOMER_DAYOFBIRTH: Day,
                        CUSTOMER_ADDRESS: result[0].CUSTOMER_ADDRESS || null,
                        CUSTOMER_GENDER: result[0].CUSTOMER_GENDER || null,
                        CUSTOMER_MONTHOFBIRTH: Month,
                        CUSTOMER_YEAROFBIRTH: Year
                    }]
                    console.log(TOKEN);
                    console.log(CUSTOMER_TOKEN);
                    console.log(CUSTOMER_TOKEN.includes(TOKEN));
                    if (CUSTOMER_TOKEN.includes(TOKEN)) {
                        handleServerUserInfo(CUSTOMER_INFO_PACKAGE, req, res);
                    }
                    else {
                        res.end();
                    }
                })
            }
            else {
                res.end();
            }
        }
    }
})
/// Function SendBackUserInfo
function handleServerUserInfo(CUSTOMER_INFO_PACKAGE, req, res) {
    console.log("confirm");
    switch (req.body.APP_ID) {
        case "PROFILE":
            return (res.send({
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                STATUS: req.body.STATUS,
                CUSTOMER_ID: req.body.CUSTOMER_ID,
                CUSTOMER_TOKEN: req.body.CUSTOMER_TOKEN,
                EXPIRED_TIME: req.body.EXPIRED_TIME,
            }));
        case "FLIGHT": {
            axios.post('http://localhost:8021/demo', {
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                STATUS: req.body.STATUS,
                CUSTOMER_ID: req.body.CUSTOMER_ID,
                CUSTOMER_TOKEN: req.body.CUSTOMER_TOKEN,
                EXPIRED_TIME: req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            res.end();
            break;
        }
        case "HOTEL": {
            axios.post('http://localhost:8021/demo', {
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                STATUS: req.body.STATUS,
                CUSTOMER_ID: req.body.CUSTOMER_ID,
                CUSTOMER_TOKEN: req.body.CUSTOMER_TOKEN,
                EXPIRED_TIME: req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            res.end();
            break;
        }
        case "AIRPORT": {
            axios.post('http://localhost:8021/demo', {
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                STATUS: req.body.STATUS,
                CUSTOMER_ID: req.body.CUSTOMER_ID,
                CUSTOMER_TOKEN: req.body.CUSTOMER_TOKEN,
                EXPIRED_TIME: req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            res.end();
            break;

        }
        case "APART": {
            axios.post('http://localhost:8021/demo', {
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                STATUS: req.body.STATUS,
                CUSTOMER_ID: req.body.CUSTOMER_ID,
                CUSTOMER_TOKEN: req.body.CUSTOMER_TOKEN,
                EXPIRED_TIME: req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            res.end();
            break;
        }
        case "XPERIENCE": {
            axios.post('http://localhost:8021/demo', {
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                STATUS: req.body.STATUS,
                CUSTOMER_ID: req.body.CUSTOMER_ID,
                CUSTOMER_TOKEN: req.body.CUSTOMER_TOKEN,
                EXPIRED_TIME: req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            res.end();
            break;
        }
        case "CARRENTAL": {
            axios.post('http://localhost:8021/demo', {
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                STATUS: req.body.STATUS,
                CUSTOMER_ID: req.body.CUSTOMER_ID,
                CUSTOMER_TOKEN: req.body.CUSTOMER_TOKEN,
                EXPIRED_TIME: req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                });
            res.end();
            break;
        }
        case "EATS": {
            axios.post('http://localhost:8021/demo', {
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                STATUS: req.body.STATUS,
                CUSTOMER_ID: req.body.CUSTOMER_ID,
                CUSTOMER_TOKEN: req.body.CUSTOMER_TOKEN,
                EXPIRED_TIME: req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            res.end();
            break;
        }
        case "VOUCHER": {
            axios.post('http://localhost:8021/demo', {
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                STATUS: req.body.STATUS,
                CUSTOMER_ID: req.body.CUSTOMER_ID,
                CUSTOMER_TOKEN: req.body.CUSTOMER_TOKEN,
                EXPIRED_TIME: req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            res.end();
            break;
        }
        case "COMBO": {
            axios.post('http://localhost:8021/demo', {
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                STATUS: req.body.STATUS,
                CUSTOMER_ID: req.body.CUSTOMER_ID,
                CUSTOMER_TOKEN: req.body.CUSTOMER_TOKEN,
                EXPIRED_TIME: req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            res.end();
            break;
        }
    }
}
module.exports = router;