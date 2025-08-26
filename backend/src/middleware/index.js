const { authJWT } = require('./authJWT');
const { attachPermissions } = require('./attachPermissions');
const { authorize, requireAdmin } = require('./authorize');

module.exports = {
  authJWT,
  attachPermissions,
  authorize,
  requireAdmin
};

