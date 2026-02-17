// backend/src/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mqttHandler = require("./services/mqttHandler");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const User = require("./models/User");
const PORT = process.env.PORT || 3000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/iot_monitor_db";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "replace_this_with_a_real_secret_key";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const app = express();
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully.");
    createDefaultAdminUser();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: IS_PRODUCTION,
      httpOnly: true,
    },
  })
);
mqttHandler.connectMqtt();
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
app.get("/", (req, res) => {
  res.send("IoT Monitor Backend is running!");
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal Server Error" });
});
async function createDefaultAdminUser() {
  try {
    const existingUser = await User.findOne({ username: "admin" });
    if (!existingUser) {
      console.log("No admin user found, creating default admin...");
      const defaultAdmin = new User({
        username: "admin",
        password: "password",
      });
      await defaultAdmin.save();
      console.log(
        "Default admin user created with username 'admin' and password 'password'."
      );
      console.warn(
        "IMPORTANT: Change the default password immediately after first login!"
      );
    } else {
      console.log("Admin user already exists.");
    }
  } catch (error) {
    console.error("Error creating/checking default admin user:", error);
  }
}
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
