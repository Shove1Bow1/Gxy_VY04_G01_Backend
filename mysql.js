const mysql=require('mysql');
const conn = mysql.createConnection({
    user: "root",
    host: "localhost",
    port: 3306,
    database: 'cnpmnc',
    password: 'debian'
});
conn.connect(err=>{
    if(err) throw err;
    else console.log("connected");
})
module.exports=conn;