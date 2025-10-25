const { authJWT } = require('./authOptimized'); // Import từ authOptimized
const { attachPermissions } = require('./attachPermissions');
const { authorize, requireAdmin } = require('./authorize');

module.exports = {
  authJWT,
  attachPermissions,
  authorize,
  requireAdmin
};

