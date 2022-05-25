
var express = require('express');
const router = express.Router();
const session = require('express-session');
const tempRun = express();
const con = require('../mysql');
const stripe = require('../stripe');
const crypto = require("crypto");
const e = require('express');
const { stringify } = require('querystring');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');
const { profile } = require('console');
const { response } = require('express');
const { decode } = require('punycode');
var nodemailer = require("nodemailer");
const conn = require('../mysql');
var ARRAY_APP_ID = ["PROFILE", "FLIGHT", "HOTEL", "AIRPORT", "APART", "XPERIENCE", "CARRENTAL", "EATS", "VOUCHER", "COMBO"];
let algorithm = "CoTu";
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
    if (req.body.CUSTOMER_EMAIL) {
        con.query("select CUSTOMER_EMAIL from CUSTOMER_SECURITY where CUSTOMER_EMAIL='" +
            req.body.CUSTOMER_EMAIL + "';", (err, result) => {
                if (err) {
                    // res.end();
                }
                else if (result[0]) {
                    res.end({ ERROR: "Email đã được dùng;" })
                } else {
                    con.query("select COUNT(*) as NUMBER from CUSTOMER_SECURITY", (err, result) => {
                        if (err) throw err;
                        numericId = result[0].NUMBER + 1;
                        const CUSTOMER_ID = 'CUS' + numericId;
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
                                const BIRTHDAY = JSON.stringify(req.body.BIRTHDAY);
                                var Year = "", Month = "", Day = "";
                                for (var i = 0; i < BIRTHDAY.length; i++) {
                                    if (i < 5 && i>0) {
                                        Year += BIRTHDAY[i];
                                    }
                                    if (i > 5 && i < 8) {
                                        Month += BIRTHDAY[i];
                                    }
                                    if (i > 8 && i < 11) {
                                        Day += BIRTHDAY[i]
                                    }
                                    if (i > 10) {
                                        break;
                                    }
                                }
                                const CUSTOMER_INFO_PACKAGE = {
                                    CUSTOMER_NAME: req.body.CUSTOMER_NAME,
                                    CUSTOMER_DAYOFBIRTH: Day,
                                    CUSTOMER_ADDRESS: null,
                                    CUSTOMER_GENDER: req.body.GENDER,
                                    CUSTOMER_MONTHOFBIRTH: Month,
                                    CUSTOMER_YEAROFBIRTH: Year,
                                    CUSTOMER_ID: CUSTOMER_ID,
                                }
                                const PACKAGE_DATA =
                                {
                                    CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                                }
                                const HASH_PACKAGE = jwt.sign(PACKAGE_DATA, algorithm, { expiresIn: "7d" });
                                if (err) console.log(err);
                                res.send({
                                    STATUS: true,
                                    PACKAGE: HASH_PACKAGE,
                                    EXPIRED_TIME: 3600 * 24 * 7
                                })
                            }
                        )
                    })
                }
            }
        )
    }
    else{
        res.send({
            ERROR:"Điền Email"
        })
    }
})
//LOGIN USING EMAIL
router.post("/LoginEmail", (req, res) => {
    if (!req.body.CUSTOMER_EMAIL) {
        res.send({ ERROR: "Please type in Your Email" });
    }
    else {
        if (!req.body.CUS_PASSWORD) {
            res.send({ ERROR: "please type in Your Password" });
        }
        else {
            con.query(
                "select * from CUSTOMER_SECURITY,CUSTOMER_INFO where CUSTOMER_EMAIL='" + req.body.CUSTOMER_EMAIL.toUpperCase()
                + "' and CUS_PASSWORD = '" + req.body.CUS_PASSWORD
                + "' and CUSTOMER_SECURITY.CUSTOMER_ID=CUSTOMER_INFO.CUSTOMER_ID;", (err, result) => {
                    if (err) {res.end();return;}
                    if (!result[0]) { 
                        res.send({ERROR:"Mật khẩu hoặc email không đúng"}); 
                        return;
                    }
                    else {
                        var Year = "", Month = "", Day = "";
                        const BIRTHDAY = JSON.stringify(result[0].DATE_OF_BIRTH);
                        for (var i = 0; i < BIRTHDAY.length; i++) {
                            if (i < 5 &&i>0) {
                                Year += BIRTHDAY[i];
                            }
                            if (i > 5 && i < 8) {
                                Month += BIRTHDAY[i];
                            }
                            if (i > 8 && i < 11) {
                                Day += BIRTHDAY[i]
                            }
                            if (i > 10) {
                                break;
                            }
                        }
                        const CUSTOMER_INFO_PACKAGE = {
                            CUSTOMER_NAME: result[0].FULL_NAME,
                            CUSTOMER_DAYOFBIRTH: Day,
                            CUSTOMER_ADDRESS: result[0].ADDRESS,
                            CUSTOMER_GENDER: result[0].CUSTOMER_GENDER,
                            CUSTOMER_MONTHOFBIRTH: Month,
                            CUSTOMER_YEAROFBIRTH: Year,
                            CUSTOMER_ID: result[0].CUSTOMER_ID,
                        }
                        const PACKAGE_DATA =
                        {
                            CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,  
                        }
                        const HASH_PACKAGE = jwt.sign(PACKAGE_DATA, algorithm, { expiresIn: "7d" });
                        res.send({
                            STATUS: true,
                            EXPIRED_TIME: 1000 * 60 * 60 * 24 * 7,
                            PACKAGE: HASH_PACKAGE
                        });
                    }
                }
            )
        }
    }
})
//LOGIN USING Phone Number
router.post("/LoginPhoneNumber", (req, res) => {

})
// get customer name
router.post("/getCustomerName", (req, res) => {
    if (!req.body.TOKEN) {
        res.end();
    }
    try {
        if (jwt.verify(req.body.TOKEN, algorithm)) {
            const INFO = jwt.decode(req.body.TOKEN);
            res.send({
                CUSTOMER_NAME: INFO.CUSTOMER_PACKAGE.CUSTOMER_NAME,
            })
        }
    }
    catch (e) {
        res.send({
            DELETE: true,
        });
    }
})
// check Session
router.post("/getStatus", (req, res) => {
    if (!req.body.TOKEN) {
        res.end();
    }
    try {
        if (jwt.verify(req.body.TOKEN, algorithm)) {
            console.log("true");
            res.send({
                STATUS: true,
            })
        }
    }
    catch (e) {
        res.send({
            STATUS: true,
        });
    }
})
// send Account info
router.post("/getCustomerInfo", (req, res) => {
    if (!req.body.TOKEN) {
        res.end();
        return;
    }
    try {
        if (jwt.verify(req.body.TOKEN, algorithm)) {
            const INFO = jwt.decode(req.body.TOKEN);
            const CUSTOMER_INFO_PACKAGE = {
                CUSTOMER_NAME: INFO.CUSTOMER_PACKAGE.CUSTOMER_NAME,
                CUSTOMER_DAYOFBIRTH: INFO.CUSTOMER_PACKAGE.CUSTOMER_DAYOFBIRTH,
                CUSTOMER_ADDRESS: INFO.CUSTOMER_PACKAGE.CUSTOMER_ADDRESS,
                CUSTOMER_GENDER: INFO.CUSTOMER_PACKAGE.CUSTOMER_GENDER,
                CUSTOMER_MONTHOFBIRTH: INFO.CUSTOMER_PACKAGE.CUSTOMER_MONTHOFBIRTH,
                CUSTOMER_YEAROFBIRTH: INFO.CUSTOMER_PACKAGE.CUSTOMER_YEAROFBIRTH,
                CUSTOMER_ID:INFO.CUSTOMER_PACKAGE.CUSTOMER_ID,
            }
            if (ARRAY_APP_ID.includes(req.body.APP_ID)) {
                conn.query("select CUSTOMER_EMAIL from CUSTOMER_SECURITY where CUSTOMER_ID='" + INFO.CUSTOMER_PACKAGE.CUSTOMER_ID + "';", (err, req) => {
                    if (err) res.end();
                    else {
                        res.send({
                            PACKAGE: CUSTOMER_INFO_PACKAGE,
                            CUSTOMER_EMAIL: result[0].CUSTOMER_EMAIL,
                        })
                        return;
                    }
                })
            }
            else {
                res.send({
                    PACKAGE: CUSTOMER_INFO_PACKAGE,
                    CUSTOMER_ID:INFO.CUSTOMER_PACKAGE.CUSTOMER_ID
                })
                return;
            }
        }
    }
    catch (e) {
        res.send({
            DELETE: true,
        });
        return;
    }

})
/// Change Password
router.post("/changePassword",(req,res)=>{
    if(req.body.OLD_PASSWORD)
    {
        try{
            if(jwt.verify(req.body.TOKEN,algorithm))
            {
                const DATA=jwt.decode(req.body.TOKEN); 
               
                conn.query("select CUS_PASSWORD from CUSTOMER_SECURITY where CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE[0].CUSTOMER_ID+"';",(err,result)=>{
                    if(err){
                        res.end();
                        return;
                    }
                    if(result[0].CUS_PASSWORD===req.body.OLD_PASSWORD){
                        res.send({STATUS:true});
                        return;
                    }
                })
            }
        }
        catch{
            res.end();
            return;
        }
    }
    if(req.body.NEW_PASSWORD){
        try{
            if(jwt.verify(req.body.TOKEN,algorithm))
            {
                const DATA=jwt.decode(req.body.TOKEN);
                conn.query("UPDATE CUSTOMER_SECURITY SET CUS_PASSWORD='"+req.body.NEW_PASSWORD+"' WHERE CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"';",(err,result)=>{
                    if(err){
                        res.end();
                        return;
                    }
                    if(result[0]===req.body.OLD_PASSWORD){
                        res.send({STATUS:true});
                        return;
                    }
                })
            }
        }
        catch{
            res.end();
            return;
        }
    }
})
/// Get Point
router.post("/postPointAvailable",(req,res)=>{  
    if(!req.body.TOKEN){
        res.end();
        return;
    }
    try{
        
        if(!jwt.verify(req.body.TOKEN,algorithm)){

        }
        const DATA=jwt.decode(req.body.TOKEN);
        conn.query("select POINT_AVAILABLE from CUSTOMER_INFO where CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"';",(err,result)=>{
            if(err){
                res.end();
                return;
            }
            res.send({
                POINT_AVAILABLE:result[0].POINT_AVAILABLE,
            })
            return;
        })
    }
    catch{
        res.end();
        return;
    }
})
/// Update Info
router.post("/updateInfo", (req, res) => {
    if(!req.body.TOKEN){
        res.end();
        return;
    }
    try{
        if(!jwt.verify(req.body.TOKEN,algorithm)){

        }
        const DATA=jwt.decode(req.body.TOKEN);
        conn.query("UPDATE CUSTOMER_INFO SET FULL_NAME='"+req.body.CUSTOMER_NAME+"',GENDER='"+req.body.CUSTOMER_GENDER+"',DATE_OF_BIRTH='"+req.body.CUSTOMER_BIRTHDAY+"',ADDRESS='"+req.body.CUSTOMER_ADDRESS+"' where CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"';",(err,result)=>{
            if(err){
                res.end();
                return;
            }
            var Year = "", Month = "", Day = "";
            const BIRTHDAY = JSON.stringify(req.body.CUSTOMER_BIRTHDAY);
            for (var i = 0; i < BIRTHDAY.length; i++) {
                if (i < 5 && i > 0) {
                    Year += BIRTHDAY[i];
                }
                if (i > 5 && i < 8) {
                    Month += BIRTHDAY[i];
                }
                if (i > 8 && i < 11) {
                    Day += BIRTHDAY[i]
                }
                if (i > 10) {
                    break;
                }
            }
            const CUSTOMER_INFO_PACKAGE = {
                CUSTOMER_NAME: req.body.CUSTOMER_NAME,
                CUSTOMER_DAYOFBIRTH: Day,
                CUSTOMER_ADDRESS: req.body.ADDRESS,
                CUSTOMER_GENDER: req.body.CUSTOMER_GENDER,
                CUSTOMER_MONTHOFBIRTH: Month,
                CUSTOMER_YEAROFBIRTH: Year,
                CUSTOMER_ID: DATA.CUSTOMER_PACKAGE.CUSTOMER_ID,
            }
            const PACKAGE_DATA =
            {
                CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
            }
            const HASH_PACKAGE = jwt.sign(PACKAGE_DATA, algorithm, { expiresIn: "7d" });
            res.send({
                STATUS: true,
                EXPIRED_TIME: 1000 * 60 * 60 * 24 * 7,
                PACKAGE: HASH_PACKAGE
            });
            return;
        })
    }
    catch{
        res.end();
        return;
    }
})
// insert Transication
// router.post("/insertTransication",(req,res)=>{
//     if(!req.body.APP_ID){
//         res.end();
//         return;
//     }
//     if(!ARRAY_APP_ID.includes(req.body.APP_ID))
//     {
//         res.end();
//         return;
//     }
//     if(!req.body.TRANSICATION_VALUE){
//         res.end();
//         return;
//     }
//     if(req.body.TYPE_ID){
//         conn.query("select * from TYPE_TRANSICATION where TYPE_ID='"+req.body.TYPE_ID+"';",(err,req)=>{
//             if(err){
//                 res.end();
//                 return;
//             }
//             if(!result[0]){
//                 res.end();
//                 return;
//             }
//         })
//     }
//     else{
//         res.end();
//         return;
//     }
//     if(req.body.TOKEN){
//         try {
//             if (jwt.verify(req.body.TOKEN, algorithm)) {
//                 const DATA=jwt.decode(req.body.TOKEN);
//                 conn.query("select COUNT(*) from CUSTOMER_HISTORY_TRANSICATION",(err,result)=>{
//                     if(err) {
//                         res.end();
//                         return;
//                     }
//                     var ID=result[0].COUNT+1;   
//                     conn.query("insert into CUSTOMER_HISTORY_TRANSICATION(TRANSICATION_ID,TYPE_ID,CUSTOMER_ID,DATE_PAID,APP_ID,TRANSACTION_VALUE_) values ('"+ID+"','"+req.body.TYPE_ID+"',"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"',"+req.body.DATE_PAID+"','"+req.body.APP_ID+"','"+req.body.TRANSICATION_VALUE+"');",(err,result2)=>{
//                         if(err){
//                             res.end();
//                             return;
//                         }
//                     })
//                 })        
//             }
//         }
//         catch (e) {
//             res.end();
//             return;
//         }
//     }
//     if(req.body.CUSTOMER_ID){
//     }
// })
// pass user info
router.post("/sendEmail",(req,res)=>{

    var transporter = nodemailer.createTransport({

        service: "gmail",
      
        port: 465,
      
        auth: {
      
          user: "Goldenaxel123@gmail.com",
      
          pass: ".Conquer8bow.Lifesuck@",
      
        },
      
        tls: {
      
          rejectUnauthorized: false,
      
        },
      });
      
      var mailOptions = {
      
        from: "goldenaxel123@gmail.com",
      
        to: req.body.CUSTOMER_EMAIL,
      
        subject: "Sending Email using Node.js",
      
        text: "Welcome to Traveloka clone!",
      
      };
      
      
      
      transporter.sendMail(mailOptions, function (error, info) {
      
        if (error) {
      
          console.log(error);
      
        } else {
      
          console.log("Email sent: " + info.response);
      
        }
      });
})
module.exports = router;