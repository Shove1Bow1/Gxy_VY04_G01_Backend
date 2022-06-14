var express = require('express');
const con = require('../mysql');
var router = express.Router();
const crypto=require("crypto");
const jwt=require("jsonwebtoken");
const conn = require('../mysql');
const algorithm="sha256";
const secretKey="CoTu";
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

// get Service Info
router.get("/getService/:id", (req, res) => {   
  if(!req.params.id){
    res.send({MESSAGE:"Không tồn tại service này",STATUS:false})
    return;
  }
  if(ARRAY_APP_ID.includes(req.params.id)){
    con.query("select * from SERVICE_PROVIDER where APP_ID ='" + req.params.id + "'", function (err, result, filesd) {
      if (err) throw err;
      res.send(result);
      return;
    });
  }
  else{
    res.send({MESSAGE:"Không tồn tại service này",STATUS:false});
    return;
  }
})

//get Barem Point
router.get("/getBaremPrice/:id",(req,res)=>{
  if(!req.params.id){
    res.send({MESSAGE:"Không tồn tại service này",STATUS:false});
    return;
  }
  if(!ARRAY_APP_ID.includes(req.params.id)){
    res.send({MESSAGE:"Không tồn tại service này",STATUS:false});
    return;
  }
  else {
    con.query("select APP_ID,MIN_PRICE,MAX_PRICE from SERVICE_PROVIDER where APP_ID ='" + req.params.id + "';", (err, result, filesd) => {
      console.log(result);
      if (err) throw err;
      res.send(JSON.stringify(result));
      return;
    });
  }
});
// 
router.get("/getBaremExchangePoint/:id",(req,res)=>{
  if(!req.params.id){
    res.send({
      MESSAGE:"Không có id",
      STATUS:false
    });
    return;
  }
  if(!ARRAY_APP_ID.includes(req.params.id)){
    res.end({
      MESSAGE:"Không tồn tại service này",
      STATUS:false
    });
    return;
  }
  con.query("select APP_ID,POINT_EXCHANGE_RANGE from SERVICE_PROVIDER where APP_ID ='" + req.params.id + "';", (err, result, filesd) => {
    console.log(result);
    if (err) throw err;
    res.send(JSON.stringify(result));
    return;
  })
})

// Update Service
router.post("/updateServiceManager",(req,res,next)=>{
  console.log(req.body.MAX_PRICE)
  if(!req.body.APP_ID){
    res.end();
    return;
  }
  con.query("select * from ADMIN where ADMIN_PASSWORD='"+req.body.TOKEN+"';",(err,resultAuth)=>{
    if(err){  
      res.end();
      return;
    }
    if(!resultAuth[0]){
      res.send({
        MESSAGE:"Cập nhật không thành công",
        STATUS:false,
      });
      return;
    }
    con.query("Update SERVICE_PROVIDER set MIN_PRICE=" + req.body.MIN_PRICE +", MAX_PRICE=" + req.body.MAX_PRICE +", POINT_EXCHANGE_RANGE =" + req.body.POINT_EXCHANGE_RANGE +" WHERE APP_ID='" + req.body.APP_ID + "';",
    function (err, result, filesd) {
      if (err){
        res.send({MESSAGE:"Xảy ra lỗi khi đổi điểm"});
        return;
      }
      res.send({
        MESSAGE: "Cập nhật thành công",
        STATUS: true
      })
      return;
    });
  })
  
})

router.post("/Login",(req,res,next)=>{
  if(!req.body.ADMIN_NAME||!req.body.ADMIN_PASSWORD){
      res.send({

      });
      console.log("run 1");
      return;
  }
  const ADMIN_OTHER_INFO=crypto.createHash(algorithm).update(req.body.ADMIN_PASSWORD).digest("hex");
  con.query("Select * from ADMIN where ADMIN_NAME='"+req.body.ADMIN_NAME+"' AND ADMIN_PASSWORD='"+ADMIN_OTHER_INFO+"';",function(err,result,filesd){
      if(err){
        res.end();
        return;
      }
      if(!result[0]){
        console.log("run 2");
        res.send({
          MESSAGE:"Sai Mật Khẩu hoặc tên Admin",
          STATUS:false,
        })
        return;
      }
      
      res.send({
        STATUS:true,
        TOKEN: ADMIN_OTHER_INFO,
        EXPIRED_TIME:1000*60*60,
      })
  })
})

// update admin password
router.post("/updatePassword",(req,res)=>{
  if(!req.body.ADMIN_OLD_PASSWORD){
    res.end();
    return;
  }
  if(!req.body.ADMIN_NEW_PASSWORD){
    res.end();
    return;
  }
  const ADMIN_OLD_PASSWORD=crypto.createHash(algorithm).update(ADMIN_OLD_PASSWORD).digest("hex");
  con.query("select * from ADMIN where ADMIN_PASSWORD='"+ADMIN_OLD_PASSWORD+"';",(err,result)=>{
    if(err){
      res.end();
      return;
    }
    if(!result[0]){
      res.send({
        MESSAGE:"Mật khẩu cũ sai"
      })
      return;
    }
  })
  const ADMIN_NEW_PASSWORD=crypto.createHash(algorithm).update(ADMIN_NEW_PASSWORD).digest("hex");
  con.query("update ADMIN set ADMIN_NEW_PASSWORD='"+ADMIN_NEW_PASSWORD+"';",(err,result)=>{
    if(err){
      res.end();
      return;
    }
    res.send({
      MESSAGE:"Cập nhật mật khẩu thành công",
      STATUS:true
    })
    return;
  })
})
module.exports = router;
