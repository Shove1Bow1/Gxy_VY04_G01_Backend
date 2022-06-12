
var express = require('express');
const router = express.Router();
const con = require('../mysql');
const stripe = require('../stripe');
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const axios = require('axios');
const conn = require('../mysql');
var ARRAY_APP_ID = ["PROFILE", "FLIGHT", "HOTEL", "AIRPORT", "APART", "XPERIENCE", "CARRENTAL", "EATS", "VOUCHER", "COMBO"];
let algorithm = "sha256";
let secretKey ="MIIBXjCCAQSgAwIBAgIGAXvykuMKMAoGCCqGSM49BAMCMDYxNDAyBgNVBAMMK3NpQXBNOXpBdk1VaXhXVWVGaGtjZXg1NjJRRzFyQUhXaV96UlFQTVpQaG8wHhcNMjEwOTE3MDcwNTE3WhcNMjIwNzE0MDcwNTE3WjA2MTQwMgYDVQQDDCtzaUFwTTl6QXZNVWl4V1VlRmhrY2V4NTYyUUcxckFIV2lfelJRUE1aUGhvMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE8PbPvCv5D5xBFHEZlBp/q5OEUymq7RIgWIi7tkl9aGSpYE35UH+kBKDnphJO3odpPZ5gvgKs2nwRWcrDnUjYLDAKBggqhkjOPQQDAgNIADBFAiEA1yyMTRe66MhEXID9+uVub7woMkNYd0LhSHwKSPMUUTkCIFQGsfm1ecXOpeGOufAhv+A1QWZMuTWqYt+uh/YSRNDn"
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
//// CUSTOMER 
//Register
router.post("/Register",(req, res) => {
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
                        let config = {
                            headers: {
                              app_id: 'vy04',
                            }
                          }
                          
                          let data = {
                            userId:CUSTOMER_ID,
                            email:req.body.CUSTOMER_EMAIL
                          }    
                        try{
                            axios.post("https://api.votuan.xyz/api/v1/user/auth/register",data,config)
                        }
                        catch(e){
                            res.end();
                            return;
                        }
                        con.query("insert into CUSTOMER_INFO(CUSTOMER_ID,FULL_NAME,GENDER,DATE_OF_BIRTH,POINT_AVAILABLE) values ('" +
                            CUSTOMER_ID + "','" +
                            req.body.CUSTOMER_NAME + "','" +
                            req.body.GENDER + "','" +
                            req.body.BIRTHDAY + "',0);"
                            , (err, result) => {
                                if (err) {
                                    res.end();
                                    return;
                                };
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
                                    username: req.body.CUSTOMER_NAME,
                                    email: req.body.CUSTOMER_EMAIL,
                                    sub: CUSTOMER_ID,
                                    type: "USER",
                                    appId: "vy04",
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
                            username: result[0].FULL_NAME,
                            email: req.body.CUSTOMER_EMAIL,
                            sub: result[0].CUSTOMER_ID,
                            type: "USER",
                            appId: "vy04",
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
router.post("/getAvailablePoint", (req, res) => {  
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
    conn.query("insert into HISTORY_TRANSACTION(TRANSACTION_ID,PAR_SER_ID,CUSTOMER_ID,TYPE_TRANSACTION,DATE_TRANSACTION,TRANSACTION_VALUE,INFO_TRANSACTION) values ('" + req.NUMBER_ID + "','" + req.PAR_SER + "','" + req.CUSTOMER_ID + "',false,'" + req.body.DATE_TRANSACTION + "','" + req.body.TRANSACTION_VALUE + "','"+req.body.INFO_TRANSACTION+"')", (err, result) => {
        if (err) {
            console.log(err);
            res.end();
            return;
        }
        console.log("run 3"); 
    });
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    todayFormat1 =yyyy+ '-'+ mm + '-' + dd  ;
    todayFormat2 =yyyy+'/'+mm+'/'+dd;
    const END_DATE=req.body.END_DATE;
    if(END_DATE===todayFormat1||END_DATE===todayFormat2){
        const POINT_AVAILABLE=parseInt(req.POINT_AVAILABLE)+parseInt(req.POINT_INSERT);
        conn.query("update CUSTOMER_INFO set POINT_AVAILABLE="+POINT_AVAILABLE+" where CUSTOMER_ID='"+req.CUSTOMER_ID+"'",(err,result)=>{
            if(err){
                console.log(err);
                res.end();
                return;
            }
            res.send({ MESSAGE: "success", STATUS: "true", HISTORY_TRANSACTION_ID: req.NUMBER_ID });
            return;
        })
    }
    else {
        conn.query("insert into PROCESS_POINT(TRANSACTION_ID,POINT_VALUE,END_DATE,REFUND_STATE) values ('" + req.NUMBER_ID + "','" + parseInt(req.POINT_INSERT) + "','" + req.body.END_DATE + "',false);", (err, result) => {
            if (err) {
                console.log(err);
                res.end();
                return;
            }
            console.log("run 5");
            res.send({ MESSAGE: "success", STATUS: "true", HISTORY_TRANSACTION_ID: req.NUMBER_ID });
            return;
        })
    }

})
// refund Process Point
router.post("/refundTransicationAndPP",refundTransicationAndPP,async(req,res,next)=>{
    console.log(req.STATUS);
    if(req.STATUS){
        conn.query("insert into HISTORY_TRANSACTION(TRANSACTION_ID,PAR_SER_ID,CUSTOMER_ID,TYPE_TRANSACTION,DATE_TRANSACTION,TRANSACTION_VALUE,REFUND_TRANSACTION) values ('" + req.NUMBER_ID + "','" + req.PAR_SER + "','" + req.CUSTOMER_ID + "',true,'" + req.body.DATE_TRANSACTION + "','" + req.TRANSACTION_VALUE + "','" + req.body.HISTORY_TRANSACTION_ID + "');", (err, result) => {
            if (err) {
                console.log(err);
                res.end();
                return;
            }
        })
        conn.query("update PROCESS_POINT set REFUND_STATE=true where TRANSACTION_ID='" + req.body.HISTORY_TRANSACTION_ID + "';", (err, result) => {
            if (err) {
                res.end();
                return;
            }
            res.send({ MESSAGE: "success", STATUS: "true", HISTORY_REFUND_TRANSACTION_ID: req.NUMBER_ID });
            return;
        })
    }
   
})
// get History Transaction
router.post("/getHistoryTransaction",getHistoryTransaction,(req,res)=>{
    res.send({RESULT:req.Result_Transaction});
    return;
})
// get Process Point
router.post("/getProcessPoint",getProcessPoint,(req,res)=>{
    res.send({STATUS:true,RESULT:req.PP});
    return;
})
// get refund list
router.post("/subtractPoint",subtractPoint,(req,res)=>{
    if(req.NEW_POINT){
        conn.query("update CUSTOMER_INFO set POINT_AVAILABLE='" + req.NEW_POINT + "' where CUSTOMER_ID='" + req.CUSTOMER_ID + "';", (err, result) => {
            if (err) {
                res.end();
                return;
            }
        })
        var today=new Date();
        var dd=String(today.getDate()).padStart(2,'0');
        var mm=String(today.getMonth()+1).padStart(2,'0');
        var yyyy=today.getFullYear();
        var resultDate=yyyy+"-"+mm+"-"+dd;
        conn.query("insert into HISTORY_POINT (HISTORY_ID,CUSTOMER_ID,APP_ID,TYPE_HISTORY_POINT,POINT_VALUE,ACTIVATED_DATE) values ('"+req.ID+"','"+req.CUSTOMER_ID+"','"+req.body.APP_ID+"',false,'"+req.body.POINT+"','"+resultDate+"');",(err,result)=>{
            if(err){
                res.end();
                return;
            }
            res.send({MESSAGE:"Mua gift voucher thành công",STATUS:true})
            return;
        })
    }
    else {
        res.send({ MESSAGE: "Không thể mua gift voucher", STATUS: false })
        return;
    }
})
// get voucher available
router.post("/getAvailableVoucher",getAvailableVoucher,(req,res)=>{
    console.log(req.VOUCHER_AVAILABLE);
    const GiftVouchers=req.GIFT_VOUCHER_AVAILABLE;
    const Vouchers=req.VOUCHER_AVAILABLE;
    res.send({
        VOUCHERS:Vouchers,
        GIFTVOUCHER:GiftVouchers,
        STATUS:true,
    })
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
    conn.query("select PP.*,HH.DATE_TRANSACTION,PS.APP_ID from HISTORY_TRANSACTION as HH, PROCESS_POINT as PP,PARTNER_SERVICE as PS where HH.CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"'and PP.REFUND_STATE=false and PP.TRANSACTION_ID=HH.TRANSACTION_ID and PP.END_DATE>CURDATE() and HH.PAR_SER_ID = PS.PAR_SER_ID;",(err,result)=>{
        if(err){
            console.log(err);
            res.end();
            return;
        }
        console.log(result);
        req.PP=result;
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
    conn.query("select END_DATE from PROCESS_POINT where DATE(END_DATE)>'"+req.body.DATE_TRANSACTION+"'and REFUND_STATE=false and TRANSACTION_ID='"+req.body.HISTORY_TRANSACTION_ID+"';",(err,result)=>{
        if(err){
            res.end();
            return;
        }
        console.log(result[0]);
        if(!result[0]){
            res.send({MESSAGE:"Không thể thực hiện giao dịch này",STATUS:"false"});
            console.log(result[0]);
            req.STATUS=false;
            return;
        }
        req.STATUS=true;
    })
    conn.query("select COUNT(*) as total from HISTORY_TRANSACTION", (err, result) => {
        if (err) {
            res.end();
            return;
        }
        console.log("run 2");
        const VALUE=parseInt(result[0].total)+1; 
        req.NUMBER_ID ="HT"+VALUE;
    })
    conn.query("select PAR_SER_ID from PARTNER_SERVICE where APP_ID='" + req.body.APP_ID + "' and PARTNER_ID='" + req.body.PARTNER_ID + "';", (err, result) => {
        if (err) {
            console.log(err);
            res.end();
            return;
        }
        console.log("run 3");
        if(!result[0])
        {
            res.send({STATUS:false,MESSAGE:"Không tồn tại service"})
            return;
        }
        req.PAR_SER = result[0].PAR_SER_ID;
    });
    conn.query("select TRANSACTION_VALUE from HISTORY_TRANSACTION where TRANSACTION_ID='"+req.body.HISTORY_TRANSACTION_ID+"';",(err,result)=>{
        if(err){
            console.log(err);
            res.end();
            return;
        }
        req.TRANSACTION_VALUE=result[0].TRANSACTION_VALUE;
        req.CUSTOMER_ID=DATA.CUSTOMER_PACKAGE.CUSTOMER_ID;
        console.log("run 4");
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
    if (!req.body.APP_ID) {
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
    if(!req.body.PARTNER_ID){
        res.send({
            MESSAGE: "Không có partner ID",
            STATUS: false,
        })
        return;
    }
    conn.query("select COUNT(*) as total from HISTORY_TRANSACTION", (err, result) => {
        if (err) {
            res.end();
            return;
        }
        console.log("run 1");
        const VALUE= parseInt(result[0].total)+1;
        req.NUMBER_ID ="HT"+VALUE;
    })
    conn.query("select POINT_AVAILABLE from CUSTOMER_INFO where CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"';",(err,result)=>{
        if(err){
            res.end();
            return;
        }
        console.log(result);
        req.POINT_AVAILABLE=result[0].POINT_AVAILABLE;
    })
    conn.query("select PAR_SER_ID from PARTNER_SERVICE where APP_ID='" + req.body.APP_ID + "' and PARTNER_ID='" + req.body.PARTNER_ID + "';", (err, result) => {
        if (err) {
            console.log(err);
            res.end();
            return;
        }
        console.log("run 2");
        if(!result[0]){
            res.send({MESSAGE:"Partner Id không tồn tại",STATUS:false})
            return;
        }
        req.PAR_SER = result[0].PAR_SER_ID;
    })
    conn.query("select * from SERVICE_PROVIDER where APP_ID='"+req.body.APP_ID+"';",(err,result)=>{
        if(err){
            console.log(err)
            res.end();
            return;
        }
        console.log("run 4");
        req.POINT_EXCHANGE=result[0].POINT_EXCHANGE_RANGE; 
        req.POINT_INSERT=parseInt(req.body.TRANSACTION_VALUE)/parseInt(req.POINT_EXCHANGE)*10;
        req.CUSTOMER_ID= DATA.CUSTOMER_PACKAGE.CUSTOMER_ID;
        next();
        return;
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
        console.log("end 1");
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
     
        try {
            if (!result[0].CUS_PASSWORD) {
                res.end();
                return;
            }
            req.PASSWORD_STATUS = true;
           
        }
        catch (e) {   
            console.log("second one");
            res.end();
            return;
        }
    });
   
    conn.query("select * from HISTORY_POINT where CUSTOMER_ID='" + DATA.CUSTOMER_PACKAGE.CUSTOMER_ID + "';", async function (err, result) {
        if (err) {
            console.log(err);
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
    console.log(req.body.TOKEN);
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
    console.log(DATA);
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
    conn.query("select * from HISTORY_TRANSACTION as HT,PARTNER_SERVICE as PS where HT.CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"' and HT.PAR_SER_ID=PS.PAR_SER_ID;",(err,result)=>{
        if(err){
            console.log(err);
            res.end();
            return;
        }
        req.Result_Transaction=result;
        console.log(req.Result_Transaction);
        next();
    })
}
//Subtract Point
async function subtractPoint(req,res,next){
    if (!req.body.TOKEN) {
        res.end();
        return;
    }
    if(!req.body.APP_ID||!ARRAY_APP_ID.includes(req.body.APP_ID)){
        res.send({MESSAGE:"App id không tồn tại"});
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
    if (!req.body.POINT||!parseInt(req.body.POINT)) {
        res.send({MESSAGE:"Sai định dạng điểm"});
        return;
    }
    const POINT_VALUE=parseInt(req.body.POINT);
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
    conn.query("select * from CUSTOMER_INFO where CUSTOMER_ID='"+DATA.CUSTOMER_PACKAGE.CUSTOMER_ID+"';",(err,result)=>{
        if(err){
            res.end();
            result;
        }

        const POINT_AVAILABLE=parseInt(result[0].POINT_AVAILABLE);
        if(POINT_AVAILABLE<POINT_VALUE && POINT_AVAILABLE-POINT_VALUE<=0){
            res.send({MESSAGE:"Điểm thưởng quy đổi không đủ"})
            return;
        }
        req.NEW_POINT=parseInt(result[0].POINT_AVAILABLE)-req.body.POINT;
        req.CUSTOMER_ID=DATA.CUSTOMER_PACKAGE.CUSTOMER_ID;  
        conn.query("select COUNT(*) as NUM from HISTORY_POINT", (err, result) => {
            if (err) {
                res.end();
                result;
            }
            NUM = parseInt(result[0].NUM) + 1;
            req.ID = "HP" + NUM;
            next();
        })
    })
}
//Get Available Vouchers
async function getAvailableVoucher(req,res,next){
   
    try{
        if (jwt.verify(req.body.TOKEN,secretKey)){

        }
    }
    catch(e){
        res.end();
        return;
    }
    const DATA=jwt.decode(req.body.TOKEN);
    let config = {
        headers: {
          user_id: DATA.CUSTOMER_PACKAGE.CUSTOMER_ID,
        }
      }
    try{
        await axios.get("https://api.votuan.xyz/api/v1/user/voucher/owner?type=available",config).then(respond=>{try{req.VOUCHER_AVAILABLE=respond.data.data.vouchers}catch(e){throw e;}});
     }
     catch(e){
       console.log(e);
       res.end();
       return;
    }
    try{
        await axios.get("https://api.votuan.xyz/api/v1/user/gift-card/owner?type=available",config).then(respond=>{try{req.GIFT_VOUCHER_AVAILABLE=respond.data.data.vouchers}catch(e){throw e;}});
     }
     catch(e){
       console.log(e);
       res.end();
       return;
    }
    next();
} 
module.exports = router;