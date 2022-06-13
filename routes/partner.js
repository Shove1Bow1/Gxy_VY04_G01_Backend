const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const conn = require("../mysql.js");
const tempRun = express();
const route = express.Router();
const jwt = require('jsonwebtoken');
var ARRAY_APP_ID = ["PROFILE", "FLIGHT", "HOTEL", "AIRPORT", "APART", "XPERIENCE", "CARRENTAL", "EATS", "VOUCHER", "COMBO"];
let secretKey = "MIIBXjCCAQSgAwIBAgIGAXvykuMKMAoGCCqGSM49BAMCMDYxNDAyBgNVBAMMK3NpQXBNOXpBdk1VaXhXVWVGaGtjZXg1NjJRRzFyQUhXaV96UlFQTVpQaG8wHhcNMjEwOTE3MDcwNTE3WhcNMjIwNzE0MDcwNTE3WjA2MTQwMgYDVQQDDCtzaUFwTTl6QXZNVWl4V1VlRmhrY2V4NTYyUUcxckFIV2lfelJRUE1aUGhvMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE8PbPvCv5D5xBFHEZlBp/q5OEUymq7RIgWIi7tkl9aGSpYE35UH+kBKDnphJO3odpPZ5gvgKs2nwRWcrDnUjYLDAKBggqhkjOPQQDAgNIADBFAiEA1yyMTRe66MhEXID9+uVub7woMkNYd0LhSHwKSPMUUTkCIFQGsfm1ecXOpeGOufAhv+A1QWZMuTWqYt+uh/YSRNDn";
let algorithm ="sha256";
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
    if(!req.body.APP_ID.includes("VOUCHER")){
        res.send({MESSAGE:"Vui lòng chọn thêm mục dịch vụ voucher"});
        return;
    }
    var numericId;
    conn.query("select COUNT(*) as NUMBER from PARTNER_SECURITY", (err, result) => {
        if (err) {
            res.end();
            return;
        }
        numericId = result[0].NUMBER + 1;
        console.log(req.body.PARTNER_NAME);
        if(!req.body.PARTNER_NAME){
            res.end();
            return;
        }
        const PARTNER_NAME=req.body.PARTNER_NAME;
        const PARTNER_ID = 'PAR' + numericId;
        conn.query("insert into PARTNER_INFO(PARTNER_ID,PARTNER_NAME) values ('" + PARTNER_ID + "','" + PARTNER_NAME + "');"
            , (err, result) => {
                if (err) {
                    res.end();
                    return;
                }
            })
        const PARTNER_PASSWORD=crypto.createHash(algorithm).update(req.body.PARTNER_PASSWORD).digest("hex");
        conn.query("insert into PARTNER_SECURITY(PARTNER_ID,PARTNER_EMAIL,PARTNER_PASSWORD) values ('" + PARTNER_ID +"','" + req.body.PARTNER_EMAIL.toUpperCase() +"','" + PARTNER_PASSWORD + "');"
            , (err, result) => {
                if (err) {
                    res.end();
                    return;
                }

            }
        );
        const APP_ID = req.body.APP_ID;
        conn.query("select COUNT(*) as total from PARTNER_SERVICE",(err,resultID)=>{
            var PAR_SER_ID=resultID[0].total+1;
            for (var i = 0; i < APP_ID.length; i++) {
                const PAR_SER_ID_INSERT="PS"+PAR_SER_ID;
                console.log(APP_ID[i]);
                conn.query("insert into PARTNER_SERVICE (PAR_SER_ID,PARTNER_ID,APP_ID) values ('"+PAR_SER_ID_INSERT+"','" + PARTNER_ID + "','" + APP_ID[i] + "');", (err, result) => {
                    if (err) throw err;
                })
                PAR_SER_ID+=1;
            }
        })
     
        var PARTNER_PACKAGE = {};
        if (req.body.APP && APP_ID.includes(req.body.APP)) {
            PARTNER_PACKAGE = {
                PARTNER_NAME: req.body.PARTNER_NAME,
                PARTNER_ID: PARTNER_ID,
                APP_ID: req.body.APP,
                name: req.body.PARTNER_NAME,
                username: req.body.PARTNER_EMAIL,
                email: req.body.PARTNER_EMAIL,
                sub: PARTNER_ID,
                type: "PARTNER",
                appId: "vy04",
                services: [req.body.APP],
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
                    name: req.body.PARTNER_NAME,
                    username: req.body.PARTNER_EMAIL,
                    email: req.body.PARTNER_EMAIL,
                    sub: PARTNER_ID,
                    type: "PARTNER",
                    appId: "vy04",
                    services: APP_ID,
                }
            }
        }
        const PARTNER_HASH_PACKAGE = jwt.sign(PARTNER_PACKAGE, secretKey, { expiresIn: "24h" })
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
    const PARTNER_PASSWORD=crypto.createHash(algorithm).update(req.body.PARTNER_PASSWORD).digest("hex");
    conn.query("select * from PARTNER_SECURITY,PARTNER_INFO where PARTNER_EMAIL='" +req.body.PARTNER_EMAIL.toUpperCase() + "' and PARTNER_PASSWORD='" +PARTNER_PASSWORD + "' and PARTNER_SECURITY.PARTNER_ID=PARTNER_INFO.PARTNER_ID;", (err, result) => {
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
                console.log(resultApp);
                for (var i = 0; i < resultApp.length; i++) {
                    ARRAY_APP_INCLUDE.push(resultApp[i].APP_ID);
                }  
             
                var PARTNER_PACKAGE = {};  
                console.log(ARRAY_APP_INCLUDE);
                if (req.body.APP && ARRAY_APP_INCLUDE.includes(req.body.APP)) {   
                    console.log("check")
                    PARTNER_PACKAGE = {
                        PARTNER_NAME: result[0].PARTNER_NAME,
                        PARTNER_ID: result[0].PARTNER_ID,
                        APP_ID: req.body.APP,
                        name: result[0].PARTNER_NAME,
                        username: req.body.PARTNER_EMAIL,
                        email: result[0].PARTNER_EMAIL,
                        sub: result[0].PARTNER_ID,
                        type: "PARTNER",
                        appId: "vy04",
                        services: [req.body.APP],
                    }
                }
                else{
                    if (!ARRAY_APP_INCLUDE.includes(req.body.APP)&& req.body.APP) {
                        res.send({ ERROR: "Tài khoản không đăng ký service này",STATUS:false });
                        return;
                    }
                    else {
                        PARTNER_PACKAGE = {
                            PARTNER_NAME: result[0].PARTNER_NAME,
                            PARTNER_ID: result[0].PARTNER_ID,
                            APP_ID: ARRAY_APP_INCLUDE,
                            name: result[0].PARTNER_NAME,
                            username: req.body.PARTNER_EMAIL,
                            email: result[0].PARTNER_EMAIL,
                            sub: result[0].PARTNER_ID,
                            type: "PARTNER",
                            appId: "vy04",
                            services: ARRAY_APP_INCLUDE,
                        }
                    }
                } 
                const PARTNER_HASH_PACKAGE = jwt.sign(PARTNER_PACKAGE, secretKey, { expiresIn: "24h" })
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
        if (jwt.verify(req.body.TOKEN, secretKey)) {
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
        if (jwt.verify(req.body.TOKEN, secretKey)) {
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
// Get History Transication
route.post("/getHistoryTransaction",(req,res)=>{
    if(!req.body.TOKEN){
        res.end();
        return;
    } 
    try{
        if(jwt.verify(req.body.TOKEN,secretKey)){
          
        }
    } 
    catch(e){
        res.end();
        return;
    }   
    const DATA=jwt.decode(req.body.TOKEN);
    if(!ARRAY_APP_ID.includes(DATA.APP_ID)){
        res.end();
        return;
    }
    console.log(DATA);
    conn.query("select * from HISTORY_TRANSACTION as HT, PARTNER_SERVICE as PS where PS.PAR_SER_ID=HT.PAR_SER_ID and PS.PARTNER_ID='"+DATA.PARTNER_ID+"' and PS.APP_ID='"+DATA.APP_ID+"';",(err,result)=>{
        if(err){
            res.end();
            return;
        }
        if(!result[0]){
            res.send({
                MESSAGE:"không có kết quả",
                STATUS:false
            });
            return;
        }
        res.send({
            RESULT: result,
            STATUS: true,
            MESSAGE: "Lấy kết quả thành công"
        });
        return;
    })
})
route.post("/getServices",(req,res)=>{
    try{
        if(jwt.verify(req.body.TOKEN,secretKey)){

        }
    }
    catch(e){
        res.send({MESSAGE:"Token không dùng được"});
        return;
    }
    const DATA=jwt.decode(req.body.TOKEN);
    const SERVICE_LINK=[];
    if(DATA.APP_ID.includes("FLIGHT")){
        SERVICE_LINK.push({
            APP_NAME:"FLIGHT",
            LINK:"/Partner/Profile",
        })
    }
    if(DATA.APP_ID.includes("HOTEL")){
        SERVICE_LINK.push({
            APP_NAME:"HOTEL",
            LINK:"/Partner/Profile",
        })
    }
    if(DATA.APP_ID.includes("AIRPORT")){
        SERVICE_LINK.push({
            APP_NAME:"AIRPORT",
            LINK:"/Partner/Profile",
        })
    }
    if(DATA.APP_ID.includes("APART")){
        SERVICE_LINK.push({
            APP_NAME:"APART",
            LINK:"/Partner/Profile",
        })
    }
    if(DATA.APP_ID.includes("XPERIENCE")){
        SERVICE_LINK.push({
            APP_NAME:"XPERIENCE",
            LINK:"/Partner/Profile",
        })
    }
    if(DATA.APP_ID.includes("COMBO")){
        SERVICE_LINK.push({
            APP_NAME:"COMBO",
            LINK:"/Partner/Profile",
        })
    }
    if(DATA.APP_ID.includes("CARRENTAL")){
        SERVICE_LINK.push({
            APP_NAME:"CARRENTAL",
            LINK:"/Partner/Profile",
        })
    }
    if(DATA.APP_ID.includes("EATS")){
        SERVICE_LINK.push({
            APP_NAME:"EATS",
            LINK:"/Partner/Profile",
        })
    }
    SERVICE_LINK.push({
        APP_NAME:"VOUCHER",
        LINK:"http://voucher.vovanhoangtuan.xyz/?token="+req.body.TOKEN+"&appId=vy04",
    })
    res.send({
        APP_SERVICE:SERVICE_LINK,
    })
    return;
})
route.post("/LoginNguyenApart", ((req, res) => {
    if (!req.body.PARTNER_EMAIL) {
        res.send({ ERROR: "Please enter your email" });
        return;
    }
    if (!req.body.PARTNER_PASSWORD) {   
        res.send({ ERROR: "Please enter your password" });
        return;
    }
    const PARTNER_PASSWORD=crypto.createHash(algorithm).update(req.body.PARTNER_PASSWORD).digest("hex");
    conn.query("select * from PARTNER_SECURITY,PARTNER_INFO where PARTNER_EMAIL='" +req.body.PARTNER_EMAIL.toUpperCase() + "' and PARTNER_PASSWORD='" +PARTNER_PASSWORD + "' and PARTNER_SECURITY.PARTNER_ID=PARTNER_INFO.PARTNER_ID;", (err, result) => {
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
                console.log(resultApp);
                for (var i = 0; i < resultApp.length; i++) {
                    ARRAY_APP_INCLUDE.push(resultApp[i].APP_ID);
                }  
             
                var PARTNER_PACKAGE = {};  
                console.log(ARRAY_APP_INCLUDE);
                if (req.body.APP && ARRAY_APP_INCLUDE.includes(req.body.APP)) {   
                    console.log("check")
                    PARTNER_PACKAGE = {
                        PARTNER_NAME: result[0].PARTNER_NAME,
                        PARTNER_ID: result[0].PARTNER_ID,
                        APP_ID: req.body.APP,
                        name: result[0].PARTNER_NAME,
                        username: req.body.PARTNER_EMAIL,
                        email: result[0].PARTNER_EMAIL,
                        sub: result[0].PARTNER_ID,
                        type: "PARTNER",
                        appId: "vy04",
                        services: [req.body.APP],
                    }
                }
                else{
                    if (!ARRAY_APP_INCLUDE.includes(req.body.APP)&& req.body.APP) {
                        res.send({ ERROR: "Tài khoản không đăng ký service này",STATUS:false });
                        return;
                    }
                    else {
                        PARTNER_PACKAGE = {
                            PARTNER_NAME: result[0].PARTNER_NAME,
                            PARTNER_ID: result[0].PARTNER_ID,
                            APP_ID: ARRAY_APP_INCLUDE,
                            name: result[0].PARTNER_NAME,
                            username: req.body.PARTNER_EMAIL,
                            email: result[0].PARTNER_EMAIL,
                            sub: result[0].PARTNER_ID,
                            type: "PARTNER",
                            appId: "vy04",
                            services: ARRAY_APP_INCLUDE,
                        }
                    }
                }
                const PARTNER_NGUYEN={
                    PARTNER_NAME: result[0].PARTNER_NAME,
                    PARTNER_ID: result[0].PARTNER_ID,
                    APP_ID: req.body.APP,
                }
                const PARTNER_HASH_PACKAGE = jwt.sign(PARTNER_PACKAGE, secretKey, { expiresIn: "24h" })
                res.send({
                    STATUS: true,
                    TOKEN: PARTNER_HASH_PACKAGE,
                    data:PARTNER_NGUYEN,
                    EXPIRED_TIME: 3600 * 24,
                })
                return;
            })
        }
    )
}));
module.exports = route;