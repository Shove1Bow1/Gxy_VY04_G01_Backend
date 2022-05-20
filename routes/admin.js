var express = require('express');
const con = require('../mysql');
var router = express.Router();
const crypto=require("crypto");
const algorithm="sha256";
/* GET Admin listing. */
var ARRAY_APP_ID = ["PROFILE", "FLIGHT", "HOTEL", "AIRPORT", "APART", "XPERIENCE", "CARRENTAL", "EATS", "VOUCHER", "COMBO"];
router.get("/getServiceManager", (req, res, next) => {
  if(true){
      con.query("select * from ADMIN where ADMIN.ADMIN_ID='AD01"+"';", function (err, result, filesd) {
      if (err) console.log(err);
      else{
        const TOKEN = crypto.createHash(algorithm).update(result[0].ADMIN_PASSWORD + result[0].ADMIN_ID).digest("hex");
        if (false){
          res.send();
        }{
          con.query("select * from SERVICE_PROVIDER",(err,resultService,ce)=>{
            if(err) console.log(err);
            res.send(JSON.stringify(resultService));
          })
        }
      }
    });
    }
  else{
    res.send();
}
});

router.get("/getServiceManager/:id", (req, res) => {   
  con.query("select * from SERVICE_PROVIDER where APP_ID ='"+req.params.id+"'",function(err,result,filesd){
      if(err) throw err;
      res.set('Access-Control-Allow-Origin', '*'); 
      res.send(JSON.stringify(result));
  });
})
router.post("/getBaremPrice",(req,res)=>{
  const id=(req.body.APP_ID);
  console.log(id);
  if(!req.body.APP_ID){
    res.end();
  }
  if(!ARRAY_APP_ID.includes(req.body.APP_ID)){
    res.end();
  }
  else {
    con.query("select APP_ID,MIN_PRICE,MAX_PRICE from SERVICE_PROVIDER where APP_ID ='" + req.body.APP_ID + "';", (err, result, filesd) => {
      console.log(result);
      if (err) throw err;
      res.send(JSON.stringify(result));
    });
  }
});
// 
router.get("/getBaremExchangePoint",(req,res)=>{
  const id=(req.body.APP_ID);
  if(!req.body.APP_ID){
    res.end();
  }
  if(!ARRAY_APP_ID.includes(req.body.APP_ID)){
    res.end();
  }
  else {
    console.log(id);
    con.query("select APP_ID,POINT_EXCHANGE_RANGE from SERVICE_PROVIDER where APP_ID ='" + req.body.APP_ID + "';", (err, result, filesd) => {
      console.log(result);
      if (err) throw err;
      res.send(JSON.stringify(result));
    })
  }
 
})
router.post("/getServiceManager/:id",(req,res,next)=>{
  if(!req.params.id){
    res.end();
  }
  else{
      con.query("Update SERVICE_PROVIDER set MIN_PRICE=" + parseInt(req.body.MIN_PRICE) +
      ", MAX_PRICE=" + parseInt(req.body.MAX_PRICE) +
      ", POINT_EXCHANGE_RANGE =" + parseInt(req.body.POINT_EXCHANGE_RANGE) +
      " WHERE APP_ID='" + req.path.id + "';",
      function (err, result, filesd) {
          if (err) throw err;
          console.log("update")
          res.send([{

          }])
      });
  }

})

router.post("/Login",(req,res,next)=>{
  console.log(req.body.ADMIN_NAME);
  if(req.body.ADMIN_NAME||req.body.ADMIN_PASSWORD){
      res.end();
  }
  con.query("Select * from ADMIN where ADMIN_NAME='"+req.body.ADMIN_NAME+"' AND ADMIN_PASSWORD='"+req.body.ADMIN_PASSWORD+"';",function(err,result,filesd){
      if(err) throw err;
      session.ADMIN_ID=result[0].ADMIN_ID;
      session.ADMIN_NAME=result[0].ADMIN_NAME;
      console.log("success");
  })
})

router.get("/Session",(req,res,next)=>{
  res.set('Access-Control-Allow-Origin', '*');
  if (session.ADMIN_ID && session.ADMIN_NAME) {
      res.send({message:"Loged in"});
  }
  else {
      res.send({message:"no Admin"})
  }
})
module.exports = router;
