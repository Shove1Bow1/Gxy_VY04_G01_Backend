
var express = require('express');
const router = express.Router();
const session = require('express-session');
const tempRun = express();
const con = require('../mysql');
const stripe = require('../stripe');
const crypto = require("crypto");
let algorithm = "sha256";
tempRun.use(session({
    resave: true,
    saveUninitialized: true,
    secret: 'somesecret',
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
router.post("/create-payment-intent", async (req, res) => {
    const { items } = req.body;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
        amount: calculateOrderAmount(items),
        currency: "eur",
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
router.post("/Register", (req, res) => {
    var numericId;

    const getNumericId = (data) => {
        numericId = data;
        console.log(numericId);
        numericId += 1;
        const CUSTOMER_ID = 'CUS' + numericId;
        console.log(CUSTOMER_ID);
        console.log(req.body.CUSTOMER_NAME);
        if (req.body.CUSTOMER_NAME === undefined ||
            req.body.CUSTOMER_NAME === null ||
            req.body.CUSTOMER_NAME.length === 0 ||
            CUSTOMER_ID === undefined ||
            CUSTOMER_ID === null) {
            console.log("ending here");
            res.end();
        }
        else {
            con.query("insert into CUSTOMER_INFO(CUSTOMER_ID,FULL_NAME,GENDER,DATE_OF_BIRTH,POINT_AVAILABLE) values ('" + CUSTOMER_ID + "','" +
                req.body.CUSTOMER_NAME + "','" +
                req.body.GENDER + "','" +
                req.body.BIRTHDAY + "',0);"
                , (err, result) => {
                    if (err) throw (err);
                })
        }
        if (req.body.CUSTOMER_EMAIL === null ||
            req.body.CUSTOMER_EMAIL === undefined ||
            req.body.CUSTOMER_EMAIL.length === 0 ||
            req.body.CUS_PASSWORD === undefined ||
            req.body.CUS_PASSWORD === null ||
            req.body.CUS_PASSWORD.length === 0) {
            res.end();
        }
        else {
            con.query("insert into CUSTOMER_SECURITY(CUSTOMER_ID,CUSTOMER_EMAIL,CUS_PASSWORD) values ('" + CUSTOMER_ID +
                "','" + req.body.CUSTOMER_EMAIL +
                "','" + req.body.CUS_PASSWORD + "');"
                , (err, result) => {
                    if (err) throw (err);

                });
        }
    }
    if (session.CUSTOMER_ID !== undefined && session.CUSTOMER_NAME !== undefined
        && session.CUSTOMER_ID !== null && session.CUSTOMER_NAME !== null && session.TOKEN !== null) {
        con.query("select * from CUSTOMER_SECURITY where CUSTOMER_ID='" + session.CUSTOMER_ID + "';", (err, result) => {
            if (err) throw err;
            if (
                result[0] !== null
            ) {
                let hashLogin = crypto.createHash(algorithm).update(result[0].CUS_PASSWORD + result[0].CUSTOMER_EMAIL).digest("hex");
                if (hashLogin === session.TOKEN) {
                    res1.send([
                        {
                            CUSTOMER_ID: session.CUSTOMER_ID,
                            CUSTOMER_NAME: session.CUSTOMER_NAME
                        }
                    ]);
                }
            }
        })

    }
    else {
        con.query("select CUSTOMER_EMAIL from CUSTOMER_SECURITY where CUSTOMER_EMAIL='" + req.body.CUSTOMER_EMAIL + "';", (err, result) => {
            console.log(result);
            if (err) {
                res.send(err)
            }
            else {
                if (result[0] !== undefined) {
                    res.send([{ "CUSTOMER_EMAIL": "Already exist Email;" }])
                }
                else {
                    con.query("select COUNT(*) as NUMBER from CUSTOMER_SECURITY", (err, result) => {
                        if (err) throw err;
                        console.log(result[0].NUMBER);
                        return getNumericId(result[0].NUMBER);
                    })
                }
            }
        })
    }

})
//LOGIN USING EMAIL
router.post("/LoginEmail", (req, res) => {
    console.log(req.body.CUSTOMER_EMAIL);
    con.query(
        "select * from CUSTOMER_SECURITY,CUSTOMER_INFO where CUSTOMER_EMAIL='" + req.body.CUSTOMER_EMAIL
        + "' and CUS_PASSWORD = '" + req.body.CUS_PASSWORD
        + "' and CUSTOMER_SECURITY.CUSTOMER_ID=CUSTOMER_INFO.CUSTOMER_ID;", (err, result) => {
            if (err) throw err;
            if (result.length === 0) { res.send("Please reenter your Account"); }
            else {
                console.log(result);
                session.TOKEN = crypto.createHash(algorithm).update(req.body.CUS_PASSWORD + req.body.CUSTOMER_EMAIL).digest("hex");
                session.CUSTOMER_ID = result[0].CUSTOMER_ID;
                session.CUSTOMER_NAME = result[0].FULL_NAME;
                const BackData =
                    [
                        {
                            CUSTOMER_ID: session.CUSTOMER_ID,
                            CUSTOMER_NAME: session.CUSTOMER_NAME,
                            CUSTOMER_TOKEN: session.TOKEN,
                        }
                    ];
                res.send(JSON.stringify(BackData));
            }
        })
})
//LOGIN USING Phone Number
router.post("/LoginPhoneNumber", (req, res) => {
    console.log(req.body.CUSTOMER_EMAIL);
    if (session.CUSTOMER_ID !== undefined && session.CUSTOMER_NAME !== undefined
        && session.CUSTOMER_ID !== null && session.CUSTOMER_NAME !== null && session.TOKEN !== null) {
        con.query("select * from CUSTOMER_SECURITY where CUSTOMER_ID='" + session.CUSTOMER_ID + "';", (err, result) => {
            console.log("check");
            if (err) throw err;
            if (
                result[0] !== null
            ) {
                let hashLogin = crypto.createHash(algorithm).update(result[0].CUS_PASSWORD + result[0].CUSTOMER_EMAIL).digest("hex");
                if (hashLogin === session.TOKEN) {
                    res.send([
                        {
                            CUSTOMER_ID: session.CUSTOMER_ID,
                            CUSTOMER_NAME: session.CUSTOMER_NAME
                        }
                    ]);
                }
            }
        })
    }
    else {
        con.query(
            "select * from PROVIDER__USER_INFO,CUSTOMER_INFO where CUSTOMER_EMAIL='" + req.body.CUSTOMER_PHONE
            + "' and CUS_PASSWORD = '" + req.body.CUS_PASSWORD
            + "' and CUSTOMER_SECURITY.CUSTOMER_ID=CUSTOMER_INFO.CUSTOMER_ID;", (err, result) => {
                if (err) throw err;
                if (result.length === 0) { res.send("Please reenter your Account"); }
                else {
                    console.log(result);
                    session.TOKEN = crypto.createHash(algorithm).update(req.body.CUS_PASSWORD + req.body.CUSTOMER_EMAIL).digest("hex");
                    session.CUSTOMER_ID = result[0].CUSTOMER_ID;
                    session.CUSTOMER_NAME = result[0].FULL_NAME;
                    const BackData =
                        [
                            {
                                CUSTOMER_ID: session.CUSTOMER_ID,
                                CUSTOMER_NAME: session.CUSTOMER_NAME,
                                CUSTOMER_TOKEN: session.TOKEN,
                            }
                        ];
                    res.send(JSON.stringify(BackData));
                }
            })
    }
})
//Check Session
router.get("/Session",(req,res)=>{
    if (session.CUSTOMER_ID !== undefined && session.CUSTOMER_NAME !== undefined
        && session.CUSTOMER_ID !== null && session.CUSTOMER_NAME !== null && session.TOKEN !== null) {
        con.query("select * from CUSTOMER_SECURITY where CUSTOMER_ID='" + session.CUSTOMER_ID + "';", (err, result) => {
            console.log("check");
            if (err) throw err;
            if (result[0] !== null) {
                let hashLogin = crypto.createHash(algorithm).update(result[0].CUS_PASSWORD + result[0].CUSTOMER_EMAIL).digest("hex");
                if (hashLogin === session.TOKEN) {
                    res.send([
                        {
                            CUSTOMER_ID: session.CUSTOMER_ID,
                            CUSTOMER_NAME: session.CUSTOMER_NAME,
                            TOKEN:session.TOKEN
                        }
                    ]);
                }
            }
        })
    }
    else{
        res.send([
            {
                CUSTOMER_ID: "null",
                CUSTOMER_NAME: "null",
                TOKEN: "null"
            }
        ])
    }
})
//LOGOUT
router.get("/Logout", (req, res) => {
    session.TOKEN = null;
    session.CUSTOMER_ID = null;
    session.CUSTOMER_NAME = null;
    res.end();
})
module.exports = router;