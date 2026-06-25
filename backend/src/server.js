require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./config/database");
const authRoutes=require("./routes/authRoutes");
const locationRoutes=require("./routes/locationRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth",authRoutes);
app.use("/api/locations",locationRoutes);

app.get("/", (req, res) => {
  res.send("Footprints backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working",
  });
});

pool
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Database connection failed:", err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});