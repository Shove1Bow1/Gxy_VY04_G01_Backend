
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
const conn = require('../mysql');
const { nextTick } = require('process');
const { addAbortSignal } = require('stream');
var ARRAY_APP_ID = ["PROFILE", "FLIGHT", "HOTEL", "AIRPORT", "APART", "XPERIENCE", "CARRENTAL", "EATS", "VOUCHER", "COMBO"];
let algorithm = "sha256";
let secretKey ="CoTu"
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
                        const PASSWORD_TOKEN=crypto.createHash(algorithm).update(req.body.CUS_PASSWORD).digest("hex");
                        con.query("insert into CUSTOMER_SECURITY(CUSTOMER_ID,CUSTOMER_EMAIL,CUS_PASSWORD) values ('" +
                            CUSTOMER_ID + "','" +
                            req.body.CUSTOMER_EMAIL.toUpperCase() +
                            "','" + PASSWORD_TOKEN + "');"
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
                                    CUSTOMER_ID: CUSTOMER_ID,
                                    CUSTOMER_OTHER_INFO:PASSWORD_TOKEN,
                                }
                                const PACKAGE_DATA =
                                {
                                    CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                                }
                                const HASH_PACKAGE = jwt.sign(PACKAGE_DATA, secretKey, { expiresIn: "7d" });
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
            const PASSWORD_TOKEN=crypto.createHash(algorithm).update(req.body.CUS_PASSWORD).digest("hex");
            con.query(
                "select * from CUSTOMER_SECURITY,CUSTOMER_INFO where CUSTOMER_EMAIL='" + req.body.CUSTOMER_EMAIL.toUpperCase()
                + "' and CUS_PASSWORD = '" + PASSWORD_TOKEN
                + "' and CUSTOMER_SECURITY.CUSTOMER_ID=CUSTOMER_INFO.CUSTOMER_ID;", (err, result) => {
                    if (err) {res.end();return;}
                    if (!result[0]) { 
                        res.send({ERROR:"Mật khẩu hoặc email không đúng"}); 
                        return;
                    }
                    else {
                        const CUSTOMER_INFO_PACKAGE = {
                            CUSTOMER_ID: result[0].CUSTOMER_ID,
                            CUSTOMER_OTHER_INFO:PASSWORD_TOKEN,
                        }
                        const PACKAGE_DATA =
                        {
                            CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,  
                        }
                        const HASH_PACKAGE = jwt.sign(PACKAGE_DATA, secretKey, { expiresIn: "7d" });
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
        if (jwt.verify(req.body.TOKEN, secretKey)) {
            const INFO = jwt.decode(req.body.TOKEN);
            conn.query("select * from CUSTOMER_SECURITY,CUSTOMER_INFO where CUSTOMER_SECURITY.CUSTOMER_ID='"+INFO.CUSTOMER_PACKAGE.CUSTOMER_ID+"' and CUS_PASSWORD='"+INFO.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO+"' and CUSTOMER_SECURITY.CUSTOMER_ID=CUSTOMER_INFO.CUSTOMER_ID;",(err,result)=>{
                if (err) {
                    res.send({ STATUS: false, MESSAGE: "please delete this token" });
                    return;
                }
                if(!result[0]){
                    res.send({ STATUS: false, MESSAGE: "please delete this token" });
                    return;
                } 
                res.send({
                    STATUS:true,
                    CUSTOMER_NAME: result[0].FULL_NAME,
                })
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
        
        if (jwt.verify(req.body.TOKEN, secretKey)) { 
            const INFO=jwt.decode(req.body.TOKEN);
            conn.query("select * from CUSTOMER_SECURITY where CUSTOMER_ID='" + INFO.CUSTOMER_PACKAGE.CUSTOMER_ID + "' and CUS_PASSWORD='" + INFO.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO + "';", (err, result) => {
                if (err) {
                    res.send({ STATUS: false, MESSAGE: "please delete this token" });
                    return;
                }
                if(!result[0]){
                    res.send({ STATUS: false, MESSAGE: "please delete this token" });
                    return;
                }
               
                res.send({
                    STATUS: true,
                })
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
        if (jwt.verify(req.body.TOKEN, secretKey)) {
            const INFO = jwt.decode(req.body.TOKEN);
            conn.query("select * from CUSTOMER_SECURITY,CUSTOMER_INFO where CUSTOMER_SECURITY.CUSTOMER_ID='" + INFO.CUSTOMER_PACKAGE.CUSTOMER_ID + "' and CUS_PASSWORD='" + INFO.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO + "' and CUSTOMER_SECURITY.CUSTOMER_ID=CUSTOMER_INFO.CUSTOMER_ID;", (err, result) => {
                if (err) {
                    res.send({ STATUS: false, MESSAGE: "please delete this token" });
                    return;
                }
                if(!result[0]){
                    res.send({ STATUS: false, MESSAGE: "please delete this token" });
                    return;
                }
                var Year = "", Month = "", Day = "";
                const BIRTHDAY = JSON.stringify(result[0].DATE_OF_BIRTH);
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
                    CUSTOMER_ID: INFO.CUSTOMER_PACKAGE.CUSTOMER_ID,
                    CUSTOMER_NAME: result[0].FULL_NAME,
                    CUSTOMER_DAYOFBIRTH: Day,
                    CUSTOMER_ADDRESS: result[0].ADDRESS,
                    CUSTOMER_GENDER: result[0].GENDER,
                    CUSTOMER_MONTHOFBIRTH: Month,
                    CUSTOMER_YEAROFBIRTH: Year,
                    CUSTOMER_OTHER_INFO: INFO.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO,
                }
                if (ARRAY_APP_ID.includes(req.body.APP_ID)) {
                    conn.query("select CUSTOMER_EMAIL from CUSTOMER_SECURITY where CUSTOMER_ID='" + INFO.CUSTOMER_PACKAGE.CUSTOMER_ID + "';", (err, req) => {
                        if (err) res.end();
                        else {
                            res.send({
                                PACKAGE: CUSTOMER_INFO_PACKAGE,
                                CUSTOMER_EMAIL: result[0].CUSTOMER_EMAIL,
                                STATUS:true,
                            })
                            return;
                        }
                    })
                }
                else {
                    res.send({
                        PACKAGE: CUSTOMER_INFO_PACKAGE,
                        STATUS:true,
                    })
                    return;
                }
            })
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
    if (req.body.OLD_PASSWORD) {
        try {
            if (jwt.verify(req.body.TOKEN, secretKey)) {
                const DATA = jwt.decode(req.body.TOKEN);
                if (DATA.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO===crypto.createHash(algorithm).update(req.body.OLD_PASSWORD).digest("hex")){
                    res.send({
                        STATUS:true,
                    })
                    return;
                }
                res.send({STATUS:false})
                return;
            }
        }
        catch {
            res.end();
            return;
        }
    }
    if (req.body.NEW_PASSWORD) {
        try {
            if (jwt.verify(req.body.TOKEN, secretKey)) {
                const INFO = jwt.decode(req.body.TOKEN);
                const PASSWORD_TOKEN = crypto.createHash(algorithm).update(req.body.NEW_PASSWORD).digest("hex");
                conn.query("UPDATE CUSTOMER_SECURITY SET CUS_PASSWORD='" + PASSWORD_TOKEN + "' WHERE CUSTOMER_ID='" + INFO.CUSTOMER_PACKAGE.CUSTOMER_ID + "' and CUS_PASSWORD='"+INFO.CUSTOMER_PACKAGE.PASSWORD_TOKEN+"';", (err, result) => {
                    console.log("test");
                    if (err) {
                        res.end();
                        return;
                    }
                    console.log(result);
                    const CUSTOMER_INFO_PACKAGE = {
                        CUSTOMER_NAME: INFO.CUSTOMER_PACKAGE.CUSTOMER_NAME,
                        CUSTOMER_DAYOFBIRTH: INFO.CUSTOMER_PACKAGE.CUSTOMER_DAYOFBIRTH,
                        CUSTOMER_ADDRESS: INFO.CUSTOMER_PACKAGE.CUSTOMER_ADDRESS,
                        CUSTOMER_GENDER: INFO.CUSTOMER_PACKAGE.CUSTOMER_GENDER,
                        CUSTOMER_MONTHOFBIRTH: INFO.CUSTOMER_PACKAGE.CUSTOMER_MONTHOFBIRTH,
                        CUSTOMER_YEAROFBIRTH: INFO.CUSTOMER_PACKAGE.CUSTOMER_YEAROFBIRTH,
                        CUSTOMER_ID: INFO.CUSTOMER_PACKAGE.CUSTOMER_ID,
                        CUSTOMER_OTHER_INFO: PASSWORD_TOKEN,
                    }
                    const PACKAGE_DATA =
                    {
                        CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                    }
                    const HASH_PACKAGE = jwt.sign(PACKAGE_DATA, secretKey, { expiresIn: "7d" });
                    res.send({
                        STATUS: true,
                        PACKAGE: HASH_PACKAGE,
                        EXPIRED_TIME: 1000 * 60 * 60 * 24 * 7,
                    });
                    return;
                })
            }
        }
        catch {
            res.end();
            return;
        }
    }
})
/// Get Point
router.post("/postPointAvailable", (req, res) => {  
    if (!req.body.TOKEN) {
        res.end();
        return;
    }
    try {
      
        if (!jwt.verify(req.body.TOKEN, secretKey)) {

        }
        const DATA = jwt.decode(req.body.TOKEN);
        conn.query("select POINT_AVAILABLE from CUSTOMER_INFO where CUSTOMER_ID='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "';", (err, result) => {
            if (err) {
                res.end();
                return;
            }
            conn.query("select CUS_PASSWORD from CUSTOMER_SECURITY where CUSTOMER_ID='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "' and CUS_PASSWORD='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO + "';", (err, result1) => {
                if (err) {
                    res.end();
                    return;
                }
                try {
                    if (!result1[0].CUS_PASSWORD) {
                        res.end();
                        return;
                    } 
                    res.send({
                        POINT_AVAILABLE: result[0].POINT_AVAILABLE,
                        STATUS: true,
                    })
                    return;
                }
                catch (e) {
                    res.end();
                    return;
                }
            });
          
            return;
        })
    }
    catch {
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
        if(jwt.verify(req.body.TOKEN,secretKey)){
            const DATA = jwt.decode(req.body.TOKEN); 
            conn.query("UPDATE CUSTOMER_INFO SET FULL_NAME='" + req.body.CUSTOMER_NAME + 
            "',GENDER='" + req.body.CUSTOMER_GENDER +
             "',DATE_OF_BIRTH='" + req.body.CUSTOMER_BIRTHDAY + 
             "',ADDRESS='" + req.body.CUSTOMER_ADDRESS + 
             "' where CUSTOMER_ID='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "';", (err, result) => {
                if (err) {
                    console.log("this can't run")
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
                    CUSTOMER_OTHER_INFO: DATA.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO,
                }
                const PACKAGE_DATA =
                {
                    CUSTOMER_PACKAGE: CUSTOMER_INFO_PACKAGE,
                }
                const HASH_PACKAGE = jwt.sign(PACKAGE_DATA, algorithm, { expiresIn: "7d" });
                console.log("end");
                res.send({
                    STATUS: true,
                    EXPIRED_TIME: 1000 * 60 * 60 * 24 * 7,
                    PACKAGE: HASH_PACKAGE
                });
                return;
            })
        }
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
// router.post("/sendEmail",(req,res)=>{
//     var transporter = nodemailer.createTransport({
//         service: "gmail",
//         port: 465,
//         auth: {
//           user: "spacingsize@gmail.com",
//           pass: "slowly123",
//         },
//         tls: {
//           rejectUnauthorized: false,
//         },
//       });
//       var mailOptions = {
//         from: "goldenaxel123@gmail.com",
//         to: req.body.CUSTOMER_EMAIL,
//         subject: "Sending Email using Node.js",
//         text: "Welcome to Traveloka clone!",
//       };
//       transporter.sendMail(mailOptions, function (error, info) {
//         if (error) {
//           console.log(error);
//         } else {
//           console.log("Email sent: " + info.response);
//         }
//       });
// })

//get history point
router.post("/getHistoryPoint",getHistoryPoint,async (req,res,next)=>{
    const HISTORY_POINT = req.resultHistoryPoint;
    if (req.PASSWORD_STATUS) {
        res.send({
            PACKAGE: HISTORY_POINT,
        })
    }
})
//insert point
router.post("/insertProcessPoint",insertProcessPoint,(req,res)=>{
    res.send({MESSAGE:"success",STATUS:"true"});
    return;
})
// refund Process Point
router.post("/refundProcessPoint",refundProcessPoint,async(req,res,next)=>{
    res.send({MESSAGE:"success",STATUS:"true"});
    return;
})
// get Process Point
router.post("/getProcessPoint",getProcessPoint,(req,res,next)=>{
    res.send({RESULT:req.Result});
    return;
})
//// FUNCTION MIDDLE WARE
// get Process Point
async function getProcessPoint(req,res,next){
    if (!req.body.TOKEN) {
        res.end();
        return;
    }
    try{
        if(jwt.verify(req.body.TOKEN,secretKey)){

        }
    }
    catch(e){
        res.end();
        return
    }
    const DATA = jwt.decode(req.body.TOKEN);
    conn.query("select CUS_PASSWORD from CUSTOMER_SECURITY where CUSTOMER_ID='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "' and CUS_PASSWORD='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO + "';", (err, result) => {
        if (err) {
            res.end();
            return;
        }
        try {
            if (!result[0].CUS_PASSWORD) {
                res.end();
                return;
            }
            req.PASSWORD_STATUS = true;
        }
        catch (e) {
            res.end();
            return;
        }
    });
    conn.query("select * from PROCESS_POINT where CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"' and STATUS=false)",async function(err,result){
        if(err){    
           
            res.end()
            return;
        }
        req.Result=await result; 
        next();
    });
   
}
// Refund Process Point
async function refundProcessPoint(req,res,next){
    if (!req.body.TOKEN) {
        res.end();
        return;
    }
    try{
        if(jwt.verify(req.body.TOKEN,secretKey)){

        }
    }
    catch(e){
        res.end();
        return
    }
    const DATA = jwt.decode(req.body.TOKEN);
    conn.query("select CUS_PASSWORD from CUSTOMER_SECURITY where CUSTOMER_ID='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "' and CUS_PASSWORD='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO + "';", (err, result) => {

        if (err) {
            res.end();
            return;
        }
        try {
            if (!result[0].CUS_PASSWORD) {
                res.end();
                return;
            }
            req.PASSWORD_STATUS = true;
        }
        catch (e) {
            res.end();
            return;
        }
    })
    conn.query("update PROCESS_POINT set  STATUS_REFUND=true where SPECIAL_APP_ID='"+req.body.SPECIAL_APP_ID+"'and STATE=false and CUSTOMER_ID='"+ DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"' and APP_ID='"+req.body.APP+"');",(err,result)=>{
        if(err){
            res.end();
            return;
        }   
        next();
    })
 
}
//Insert Process Point
async function insertProcessPoint(req,res,next){
    if (!req.body.TOKEN) {
        res.end();
        return;
    }
    try{
        if(jwt.verify(req.body.TOKEN,secretKey)){

        }
    }
    catch(e){
        res.end();
        return
    }
  
    const DATA = jwt.decode(req.body.TOKEN);
    conn.query("select CUS_PASSWORD from CUSTOMER_SECURITY where CUSTOMER_ID='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "' and CUS_PASSWORD='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO + "';", (err, result) => {
    console.log("test this");
        if (err) {
            res.end();
            return;
        }
        try {
            if (!result[0].CUS_PASSWORD) {
                res.end();
                return;
            }
            req.PASSWORD_STATUS = true;
        }
        catch (e) {
            res.end();
            return;
        }
    });
    if(!req.body.END_DATE){
        res.end();
        return;
    }
    if(!req,body.SPECIAL_APP_ID){
        res.end();
        return;
    }
    conn.query("select COUNT(*) as total from PROCESS_POINT",(err,result)=>{
        if(err){
            res.end();
            return;
        }
        req.NUMBER=result[0].total;
    })
    const NEW_PROCESS_ID="PROP"+req.NUMBER+1;
    conn.query("insert into PROCESS_POINT(PROCESS_ID,CUSTOMER_ID,APP_ID,STATE,STATUS_REFUND,POINT_VALUE,END_DATE,SPECIAL_APP_ID) values ('"+NEW_PROCESS_ID+"','"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"','"+req.body.APP+"',false,false,'"+req.body.END_DATE+"','"+req.body.SPECIAL_APP_ID+"');",(err,result)=>{
        if(err){
            console.log(err);
            res.end();
            return;
        }
        next();
    })
}
//Get History Point - Middle Ware
async function getHistoryPoint(req, res, next) {
    if (!req.body.TOKEN) {
        res.end();
        return;
    }
    try{
        if(jwt.verify(req.body.TOKEN,secretKey)){

        }
    }
    catch(e){
        res.end();
        return
    }  
    const DATA = jwt.decode(req.body.TOKEN);
    req.TOKEN=DATA;
    conn.query("select CUS_PASSWORD from CUSTOMER_SECURITY where CUSTOMER_ID='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "' and CUS_PASSWORD='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_OTHER_INFO + "';", (err, result) => {

        if (err) {
            res.end();
            return;
        }
        console.log("second one");
        try {
            if (!result[0].CUS_PASSWORD) {
                res.end();
                return;
            }
            req.PASSWORD_STATUS = true;
           
        }
        catch (e) {
            res.end();
            return;
        }
    });
   
    conn.query("select * from HISTORY_POINT where CUSTOMER_ID='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "';", async function (err, result) {
        if (err) {
            res.end();
            return;
        }
        console.log("this one")
        req.resultHistoryPoint = result; 
        next();
    });
   
}

module.exports = router;