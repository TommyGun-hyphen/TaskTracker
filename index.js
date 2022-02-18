const express = require('express');
const app = express();
require('dotenv').config();


const port = process.env.port || 3000;
app.listen(port, ()=>{
    console.log('listening to port ' + port);
})