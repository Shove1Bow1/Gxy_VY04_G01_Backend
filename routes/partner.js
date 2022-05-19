const express = require("express");
const session = require("express-session");
const crypto=require("crypto");
const conn = require("../mysql.js");
const tempRun = express();
const route = express.Router();
var ARRAY_APP_ID = ["PROFILE", "FLIGHT", "HOTEL", "AIRPORT", "APART", "XPERIENCE", "CARRENTAL", "EATS", "VOUCHER", "COMBO"];
let algorithm = "sha256";
// Get App Id
route.post("/getAppId", (req, res) => {
    if(!req.body.APP_ID){
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
route.post("/Register", ((req, res) => {
    var numericId;
    console.log(req.body.PARTNER_EMAIL);
    if (req.body.PARTNER_EMAIL === null ||
        req.body.PARTNER_EMAIL === undefined ||
        req.body.PARTNER_EMAIL.length === 0) {
            res.send();
    }
    else {
        conn.query("select PARTNER_EMAIL from PARTNER_SECURITY where PARTNER_EMAIL='" + req.body.PARTNER_EMAIL.toUpperCase() + "';", (err, existEmail) => {
            if (err) {
                console.log("end"); 
                res.end();
            }
            console.log(existEmail);
            if (!existEmail) {
                console.log("end 2"); 
                res.send([{ ERROR: "Email Already Been Used" }])
            }
            else {
                
                conn.query("select COUNT(*) as NUMBER from PARTNER_SECURITY", (err, result) => {
                    if (err) throw err;
                    console.log(result[0].NUMBER);
                    numericId = result[0].NUMBER;
                    console.log(numericId);
                    numericId += 1;
                    const PARTNER_ID = 'PAR' + numericId;
                    console.log(PARTNER_ID);
                    conn.query("insert into PARTNER_INFO(PARTNER_ID,PARTNER_NAME) values ('" + PARTNER_ID + "','" +
                        + req.body.PARTNER_NAME + "');"
                        , (err, result) => {
                            if (err) throw (err);
                        })
                    conn.query("insert into PARTNER_SECURITY(PARTNER_ID,PARTNER_EMAIL,PARTNER_PASSWORD) values ('" + PARTNER_ID +
                        "','" + req.body.PARTNER_EMAIL.toUpperCase() +
                        "','" + req.body.PARTNER_PASSWORD + "');"
                        , (err, result) => {
                            if (err) throw (err);
                           
                        }
                    );
                    const APP_ID=req.body.APP_ID; 
                    for (var i = 0; i < APP_ID.length; i++) {
                        conn.query("insert into PARTNER_SERVICE (PARTNER_ID,APP_ID) values ('" + PARTNER_ID + "','" + APP_ID[i] + "');", (err, result) => {
                            if (err) throw err;
                        })
                    } 
                    const TOKEN = crypto.createHash(algorithm).update(req.body.PARTNER_PASSWORD+req.body.PARTNER_EMAIL.toUpperCase()).digest("hex");
                    res.send([{
                        STATUS:true,
                        EXPIRED_TIME:3600*24,
                        PARTNER_TOKEN:TOKEN,
                        PARTNER_NAME:req.body.PARTNER_NAME,
                        PARTNER_ID:PARTNER_ID,
                        APP_ID:req.body.APP_ID
                    }]);
                })
            }
        });
    }
}))

// Partner Login

route.post("/Login", ((req, res) => {
    if(!req.body.PARTNER_EMAIL){
        res.send([{ERROR:"Enter your email"}]);
    }
    if(!req.body.PARTNER_PASSWORD){
        res.send([{ERROR:"Enter your password"}]);
    }
    else{
        console.log(req.body.PARTNER_EMAIL.toUpperCase());
        conn.query("select * from PARTNER_SECURITY,PARTNER_INFO where PARTNER_EMAIL='"+
            req.body.PARTNER_EMAIL.toUpperCase()+"' and PARTNER_PASSWORD='"+
            req.body.PARTNER_PASSWORD+"' and PARTNER_SECURITY.PARTNER_ID=PARTNER_INFO.PARTNER_ID;",(err,result)=>{
            if(err) console.log(err);
            if(!result[0]){
                res.send([{ERROR:"Result is empty"}]);
            }
            else{
                const TOKEN = crypto.createHash(algorithm).update(req.body.PARTNER_PASSWORD + req.body.PARTNER_EMAIL.toUpperCase()).digest("hex");
                conn.query("select * from PARTNER_SERVICE where PARTNER_ID='" + result[0].PARTNER_ID + "';", (err, resultApp) => {
                    var ARRAY_APP_INCLUDE=[];
                    if(err){res.end();}
                    console.log(resultApp[0].APP_ID);
                    for(var i=0;i<resultApp.length;i++){
                        ARRAY_APP_INCLUDE.push(resultApp[i].APP_ID);
                    }
                    console.log(ARRAY_APP_INCLUDE);
                    res.send([{
                        STATUS: true,
                        PARTNER_TOKEN: TOKEN,
                        PARTNER_NAME: result[0].PARTNER_NAME,
                        PARTNER_ID: result[0].PARTNER_ID,
                        EXPIRED_TIME: 3600 * 24,
                        APP_ID:ARRAY_APP_INCLUDE,
                    }])
                })
            }
        })
    }
}));

// Check Session

route.get("/Session", (req, res) => {
  
});

// Send Partner Info
route.get("/getPartnerInfo",(req,res)=>{
    if(!req.body.PARTNER_NAME){
        res.end();
    }
    else{
        if(!req.body.TOKEN){
            res.end()
        }
        else{
            conn.query("select * from PARTNER_SECURITY where PARTNER_SECURITY.PARTNER_ID=PARTNER_INFO.PARTNER_ID",(err,res)=>{
                if(err){
                    res.end();
                }
                const TOKEN=req.body.TOKEN;
                const CONFIRM_TOKEN=crypto.createHash(algorithm).update(result[0].PARTNER_PASSWORD+result[0].PARTNER_EMAIL.toUpperCase()).digest("hex");
                if(CONFIRM_TOKEN.includes(TOKEN)){
                    HandleDataSending(res,req,result);
                }
                else{
                    res.end();
                }
            })
        }
    }
})

// Partner log out

route.post("/logout", (req, res) => {
    
})
// Function Handle Data Sending
function HandleDataSending(res, req, result) {
    switch (req.body.APP_ID) {
        case "PROFILE": {
            res.send([{
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:3600*24*1,
            }]);
            break;
        }
        case "FLIGHT":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            break;
        }
        case "CARRENTAL":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            break;
        }
        case "HOTEL":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            break;
        }
        case "AIRPORT":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            break;
        }
        case "APART":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            break;
        }
        case "XPERIENCE":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            break;
        }
        case "COMBO":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            break;
        }
        case "VOUCHER":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:req.body.EXPIRED_TIME,
            }).then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
                .catch(error => {
                    console.error(error);
                })
            break;
        }
    }
}
module.exports = route;