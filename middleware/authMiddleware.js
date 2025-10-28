const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserStatusService = require('../utils/userStatusService');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

module.exports = (roles = [], isPublic = false) => {
  return async (req, res, next) => {
    // If the route is public, bypass authentication
    if (isPublic) {
      return next();
    }
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check user status for non-admin users
      if (decoded.role === 'user') {
        const userStatus = await User.findById(decoded.id).select('status suspensionEndDate');
        
        if (!userStatus) {
          return res.status(401).json({ 
            error: 'User not found',
            message: 'User account does not exist'
          });
        }

        // Check if user is deactivated
        if (userStatus.status === 'deactivated') {
          return res.status(403).json({ 
            error: 'Account deactivated',
            message: 'Your account has been deactivated. Please contact support.',
            status: 'deactivated'
          });
        }

        // Check if user is suspended
        if (userStatus.status === 'suspended') {
          const now = new Date();
          if (userStatus.suspensionEndDate && userStatus.suspensionEndDate > now) {
            return res.status(403).json({ 
              error: 'Account suspended',
              message: `Your account is suspended until ${userStatus.suspensionEndDate.toLocaleDateString('en-IN')}. Please contact support.`,
              status: 'suspended',
              suspensionEndDate: userStatus.suspensionEndDate
            });
          }
          // Suspension has expired, but user status hasn't been updated yet
          // Allow access but the cron job will update the status
        }
      }
      
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Access denied. Insufficient permissions.',
          debug: {
            userRole: decoded.role,
            requiredRoles: roles,
            hasAccess: roles.includes(decoded.role)
          }
        });
      }
      
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
};
