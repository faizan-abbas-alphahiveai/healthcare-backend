

const http = require('http');
const { connectDB } = require("./src/utils/db.util.js");
const { app } = require('./src/server/serverApp.js');


require('dotenv').config();

// MongoDB Connection
connectDB();

// Start Server with Socket.IO
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);


server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);

});
