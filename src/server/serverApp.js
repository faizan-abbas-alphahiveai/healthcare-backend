const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorHandler = require("../middleware/errorHandler.middleware.js");
const userRoutes = require("../routes/user.routes.js");
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(cookieParser());
// Error Handler

// Routes


// Use routes
app.use('/api/auth', userRoutes);
app.use(errorHandler);


module.exports = { app };
