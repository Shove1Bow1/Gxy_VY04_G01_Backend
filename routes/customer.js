
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
const { resolveSoa } = require('dns');
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
router.post("/insertTransicationAndPP",insertTransicationAndPP,(req,res)=>{
    res.send({MESSAGE:"success",STATUS:"true",HISTORY_TRANSACTION_ID:req.NUMBER_ID});
    return;
})
// refund Process Point
router.post("/refundTransicationAndPP",refundTransicationAndPP,async(req,res,next)=>{
    res.send({MESSAGE:"success",STATUS:"true",HISTORY_REFUND_TRANSACTION_ID:req.NUMBER_ID});
    return;
})
// get History Transaction
router.post("/getHistoryTransaction",getHistoryTransaction,(req,res)=>{
    res.send({RESULT:req.Result_Transaction});
    return;
})
// get Process Point
router.post("/getProcessPoint",getProcessPoint,(req,res)=>{
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
            console.log("run1");
        }
        catch (e) {
            res.end();
            return;
        }
    });
    conn.query("select * from HISTORY_TRANSACTION as HH, PROCESS_POINT as PP where CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"' and PP.REFUND_STATE=false and PP.TRANSACTION_ID=HH.TRANSACTION_ID and PP.END_DATE<CURDATE();",(err,result)=>{
        if(err){
            res.end();
            return;
        }
        req.Result_Transaction=result;
        console.log(req.Result_Transaction);
        next();
    })
}
// Refund Process Point
async function refundTransicationAndPP(req,res,next){
    if (!req.body.TOKEN) {
        res.end();
        return;
    }
    try {
        if (jwt.verify(req.body.TOKEN,secretKey)) {

        }
    }
    catch (e) {
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
        }
        catch (e) {
            res.end();
            return;
        }
    });
    if(!req.body.HISTORY_TRANSACTION_ID){
        res.end();
        return;
    }
    if(!req.body.DATE_TRANSACTION){
        res.end();
        return;
    }
    conn.query("select END_DATE from PROCESS_POINT where DATE(END_DATE)>'"+req.body.DATE_TRANSACTION+"'",(err,result)=>{
        if(err){
            res.end();
            return;
        }
        if(!result[0]){
            res.send({
               MESSAGE:"Không thể hoàn trả dịch vụ",
               STATUS:false, 
            })
        }
    })
    conn.query("select COUNT(*) as total from HISTORY_TRANSACTION", (err, result) => {
        if (err) {
            res.end();
            return;
        }
        req.NUMBER_ID ="HT"+ result[0].total+1;
    })
    conn.query("select PAR_PER_ID from PARTNER_SERVICE where APP_ID='" + req.body.APP_ID + "' and PARTNER_ID='" + req.body.PARTNER_ID + "');", (err, result) => {
        if (err) {
            res.end();
            return;
        }
        req.PAR_SER = result[0].PAR_SER_ID;
    })
    conn.query("select TRANSACTION_VALUE from HISTORY_TRANSACTION where TRANSACTION_ID='"+req.body.HISTORY_TRANSACTION_ID+"')",(err,result)=>{
        if(err){
            res.end();
            return;
        }
        req.TRANSACTION_VALUE=result[0].TRANSACTION_VALUE;
    })
    conn.query("insert into HISTORY_TRANSACTION(TRANACTION_ID,PAR_SER_ID,CUSTOMER_ID,TYPE_TRANSACTION,DATE_TRANSACTION,TRANSACTION_VALUE,REFUND_TRANSACTION) values ('" + req.NUMBER_ID + "','" + req.PAR_SER + "','" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "',true,'" + req.body.DATE_TRANSACTION + "','" + req.TRANSACTION_VALUE + "','"+req.body.HISTORY_TRANSACTION_ID+"');", (err, result) => {
        if (err) {
            res.end();
            return;
        }
    })
    conn.query("update PROCESS_POINT set REFUND_STATE=true where TRANSACTION_ID='"+req.body.HISTORY_TRANSACTION_ID+"';",(err,result)=>{
        if(err){
            res.end();
            return;
        }
        next();
    })
}
//Insert Process Point
async function insertTransicationAndPP(req, res, next) {
    if (!req.body.TOKEN) {
        res.end();
        return;
    }
    try {
        if (jwt.verify(req.body.TOKEN, secretKey)) {

        }
    }
    catch (e) {
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
        }
        catch (e) {
            res.end();
            return;
        }
    });
    if (!req.body.END_DATE) {
        res.end();
        return;
    }
    if (!req, body.APP_ID) {
        res.end();
        return;
    }
    if (!req.body.TRANSACTION_VALUE) {
        res.send({
            MESSAGE: "Chưa có số tiền thanh toán",
            STATUS: false,
        });
        return;
    }
    if (!req.body.DATE_TRANSACTION) {
        res.send({
            MESSAGE: "chưa có ngày thanh toán",
            STATUS: false,
        })
        return;
    }
    conn.query("select COUNT(*) as total from HISTORY_TRANSACTION", (err, result) => {
        if (err) {
            res.end();
            return;
        }
        req.NUMBER_ID ="HT"+ result[0].total+1;
    })
    const NEW_PROCESS_ID = "HT" + req.NUMBER + 1;
    conn.query("select PAR_PER_ID from PARTNER_SERVICE where APP_ID='" + req.body.APP_ID + "' and PARTNER_ID='" + req.body.PARTNER_ID + "');", (err, result) => {
        if (err) {
            res.end();
            return;
        }
        req.PAR_SER = result[0].PAR_SER_ID;
    })
    conn.query("insert into HISTORY_TRANSACTION(TRANACTION_ID,PAR_SER_ID,CUSTOMER_ID,TYPE_TRANSACTION,DATE_TRANSACTION,TRANSACTION_VALUE,INFO_TRANSACTION) values ('" + req.NUMBER_ID + "','" + req.PAR_SER + "','" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "',false,'" + req.body.DATE_TRANSACTION + "','" + req.body.TRANSACTION_VALUE + "','"+req.body.INFO_TRANSACTION+"')", (err, result) => {
        if (err) {
            res.end();
            return;
        }
    })
    conn.query("select * from SERVICE_PROVIDER where APP_ID='"+req.body.APP_ID+"');",(err,result)=>{
        if(err){
            res.end();
            return;
        }
        req.POINT_EXCHANGE=result[0].POINT_EXACHANGE_RANGE;
    })
    const POINT_INSERT=parseInt(req.body.TRANSACTION_VALUE)/parseInt(req.POINT_EXCHANGE);
    conn.query("insert into PROCESS_POINT(TRANSACTION_ID,POINT_VALUE,END_DATE) values ('"+req.PAR_SER+"','"+POINT_INSERT+"','"+req.body.END_DATE+"');",(err,result)=>{
        if(err){
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
//Get History Transaction - Middle ware
async function getHistoryTransaction(req,res,next){
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
            console.log("run1");
        }
        catch (e) {
            res.end();
            return;
        }
    });
    conn.query("select * from HISTORY_TRANSACTION where CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"';",(err,result)=>{
        if(err){
            res.end();
            return;
        }
        req.Result_Transaction=result;
        console.log(req.Result_Transaction);
        next();
    })
}
module.exports = router;