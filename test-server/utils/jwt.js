const jwt = require('jsonwebtoken');

// Secret key for signing tokens - in production, store this in environment variables
const JWT_SECRET = 'mysecretkey';
// Token expiration time
const JWT_EXPIRES_IN = '7d';

const jwtUtil = {
  // Generate a JWT token for a user
  generateToken: (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  },

  // Verify a JWT token
  verifyToken: (sessionId) => {
    try {
      const decoded = jwt.verify(sessionId, JWT_SECRET);
      return { valid: true, userId: decoded.userId };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },
};

module.exports = jwtUtil;
