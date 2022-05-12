const mysql=require('mysql');
const conn = mysql.createConnection({
    user: "root",
    host: "containers-us-west-57.railway.app",
    port: 5514,
    database: 'CNPMNC',
    password: 'pMKIS1SHPtwcfaSAfJjy'
});
conn.connect(err=>{
    if(err) throw err;
    else console.log("connected");
})
module.exports=conn;