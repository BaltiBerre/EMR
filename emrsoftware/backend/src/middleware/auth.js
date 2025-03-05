const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  
  console.log('Cookie token:', token);

  if (!token) {
    console.log('No token in cookies');
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Error verifying token:', err);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    console.log('Decoded user:', JSON.stringify(user, null, 2));
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;