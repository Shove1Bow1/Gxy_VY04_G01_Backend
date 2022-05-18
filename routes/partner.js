const express = require("express");
const session = require("express-session");
const crypto=require("crypto");
const conn = require("../mysql.js");
const tempRun = express();
const route = express.Router();
var ARRAY_APP_ID = ["PROFILE", "FLIGHT", "HOTEL", "AIRPORT", "APART", "XPERIENCE", "CARRENTAL", "EATS", "VOUCHER", "COMBO"];
let algorithm = "sha256";
// Get App Id
router.post("/getAppId", (req, res) => {
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
    const getNumericId = (data) => {
        
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
            if (!result[0]) {
                res.send([{ ERROR: "Email Already Used" }])
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
                    conn.query("insert into PARTNER_INFO(PARTNER_ID,APP_ID,PARTNER_NAME) values ('" + PARTNER_ID + "','" +
                        req.body.APP_ID + "','" +
                        req.body.PARTNER_NAME + "');"
                        , (err, result) => {
                            if (err) throw (err);
                        })
                    conn.query("insert into PARTNER_SECURITY(PARTNER_ID,PARTNER_EMAIL,PARTNER_PASSWORD) values ('" + PARTNER_ID +
                        "','" + req.body.PARTNER_EMAIL +
                        "','" + req.body.PARTNER_PASSWORD + "');"
                        , (err, result) => {
                            if (err) throw (err);
                            const TOKEN = crypto.createHash(algorithm).update(req.body.PARTNER_EMAIL + req.body.PARTNER_PASSWORD).digest("hex");
                            res.send([{
                                STATUS:true,
                                EXPIRED_TIME:3600*24,
                                PARTNER_TOKEN:TOKEN,
                                PARTNER_NAME:req.body.PARTNER_NAME,
                                PARTNER_ID:PARTNER_ID
                            }]);
                        }
                    );
                })
            }
        });
    }
}))

// Partner Login

route.post("/Login", ((req, res) => {
    if(!req.body.APP_ID){
        res.send([{ERROR:"Please choose a Services"}]);
    }
    else{
        conn.query("select * from PARTNER_SECURITY,PARTNER_INFO where PARTNER_EMAIL='"+
            req.body.PARTNER_EMAIL+"' and PARTNER_PASSWORD='"+
            req.body.PARTNER_PASSWORD+"' and PARTNER_SECURITY.PARTNER_ID=PARTNER_INFO.PARTNER_ID;",(err,result)=>{
            if(err) console.log(err);
            if(!result[0]){
                res.send([{EMPTY:"Result is empty"}]);
            }
            else{
                const TOKEN=crypto.createHash(algorithm).update(req.body.PARTNER_PASSWORD+req.body.PARTNER_EMAIL.toUpperCase()).digest("hex");
                req.send([{
                    STATUS:true,
                    PARTNER_TOKEN:TOKEN,
                    PARTNER_NAME:result[0].PARTNER_NAME,
                    PARTNER_ID:result[0].PARTNER_ID,
                    EXPIRED_TIME:3600*24,
                }])
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
                EXPIRED_TIME:3600*24,
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
        case "CARRENTAL":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:3600*24,
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
        case "HOTEL":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:3600*24,
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
        case "AIRPORT":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:3600*24,
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
        case "APART":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:3600*24,
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
        case "XPERIENCE":{
            axios.post('http://localhost:8021/demo', {
                STATUS:true,
                PARTNER_TOKEN:TOKEN,
                PARTNER_NAME:result[0].PARTNER_NAME,
                PARTNER_ID:result[0].PARTNER_ID,
                EXPIRED_TIME:3600*24,
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
module.exports = route;