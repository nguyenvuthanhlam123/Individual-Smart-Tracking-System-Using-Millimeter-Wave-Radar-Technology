// backend/src/routes/auth.js
const express = require("express");
const User = require("../models/User");
const router = express.Router();
router.post("/login", async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required." });
  }
  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      console.log(`Login attempt failed: User not found - ${username}`);
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(
        `Login attempt failed: Invalid password for user - ${username}`
      );
      return res.status(401).json({ error: "Invalid credentials." });
    }
    req.session.userId = user._id;
    req.session.username = user.username;
    console.log(`Login successful: User ${user.username} logged in.`);
    res
      .status(200)
      .json({
        message: "Login successful",
        user: { id: user._id, username: user.username },
      });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
});
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res
        .status(500)
        .json({ error: "Could not log out, please try again." });
    }
    res.clearCookie("connect.sid");
    console.log("User logged out successfully.");
    res.status(200).json({ message: "Logged out successfully." });
  });
});
router.get("/status", (req, res) => {
  if (req.session && req.session.userId) {
    res
      .status(200)
      .json({
        isAuthenticated: true,
        user: { id: req.session.userId, username: req.session.username },
      });
  } else {
    res.status(200).json({ isAuthenticated: false });
  }
});
module.exports = router;
