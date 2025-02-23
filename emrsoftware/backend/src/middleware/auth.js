//emrsoftware/backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Received token:', token);

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Error verifying token:', err);
      return res.sendStatus(403);
    }
    console.log('Decoded user:', JSON.stringify(user, null, 2));
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;