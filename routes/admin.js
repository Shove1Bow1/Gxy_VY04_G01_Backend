var express = require('express');
const con = require('../mysql');
var router = express.Router();

/* GET Admin listing. */
router.get("/getServiceManager", (req, res, next) => {
  con.query("select * from SERVICE_PROVIDER", function (err, result, filesd) {
      if (err) throw err;
      res.set('Access-Control-Allow-Origin', '*')
      res.send(JSON.stringify(result));
  });
});

router.get("/getServiceManager/:id", (req, res) => {   
  con.query("select * from SERVICE_PROVIDER where APP_ID ='"+req.params.id+"'",function(err,result,filesd){
      if(err) throw err;
      res.set('Access-Control-Allow-Origin', '*'); 
      res.send(JSON.stringify(result));
  });
})
router.get("/getBaremPrice",(req,res)=>{
  const id=(req.body.APP_ID);
  console.log(id);
  con.query("select APP_ID,MIN_PRICE,MAX_PRICE from SERVICE_PROVIDER where APP_ID ='"+req.body.APP_ID+"';",(err,result,filesd)=>{
      console.log(result);
      if(err) throw err;
      res.send(JSON.stringify(result));
  })
})
router.get("/getBaremExchangePoint",(req,res)=>{
  const id=(req.body.APP_ID);
  console.log(id);
  con.query("select APP_ID,POINT_EXCHANGE_RANGE from SERVICE_PROVIDER where APP_ID ='"+req.body.APP_ID+"';",(err,result,filesd)=>{
      console.log(result);
      if(err) throw err;
      res.send(JSON.stringify(result));
  })
})
router.post("/getServiceManager/:id",(req,res,next)=>{
  con.query("Update SERVICE_PROVIDER set MIN_PRICE=" + parseInt(req.body.MIN_PRICE) +
      ", MAX_PRICE=" + parseInt(req.body.MAX_PRICE) +
      ", POINT_EXCHANGE_RANGE =" + parseInt(req.body.POINT_EXCHANGE_RANGE) +
      " WHERE APP_ID='" + req.path.id + "';",
      function (err, result, filesd) {
          if (err) throw err;
          console.log("update")
          res.send("Updated")
      });
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

router.get("/StayLogin",(req,res,next)=>{
  res.set('Access-Control-Allow-Origin', '*');
  if (session.ADMIN_ID && session.ADMIN_NAME) {
      res.send({message:"Loged in"});
  }
  else {
      res.send({message:"no Admin"})
  }
})

router.get("/Logout",(req,res,next)=>{
  session.ADMIN_ID=null;
  session.ADMIN_NAME=null;
  console.log(req.session);
  res.end();
})

module.exports = router;
