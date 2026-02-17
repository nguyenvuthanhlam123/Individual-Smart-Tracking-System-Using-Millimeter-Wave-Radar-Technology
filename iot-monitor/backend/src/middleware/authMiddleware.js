// backend/src/middleware/authMiddleware.js
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res
      .status(401)
      .json({ error: "Authentication required. Please log in." });
  }
};
module.exports = { requireAuth };
