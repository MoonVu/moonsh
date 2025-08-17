/**
 * Ánh xạ groupCode sang role
 * Quy ước: groupCode chỉ để hiển thị/lọc; role để quyết định quyền
 */

const { ROLES } = require('./permissions');

// Ánh xạ groupCode → role theo yêu cầu
const GROUP_TO_ROLE_MAP = {
  // Admin roles
  'TT': ROLES.ADMIN,        // Trưởng thành
  'PCQ': ROLES.ADMIN,       // Phó Chủ quản  
  'CQ': ROLES.ADMIN,        // Chủ quản

  // XNK role
  'XNK': ROLES.XNK,         // Xuất nhập khẩu

  // CSKH roles
  'CSKH': ROLES.CSKH,       // Chăm sóc khách hàng
  'CSOL': ROLES.CSKH,       // Chăm sóc khách hàng online
  'CSDL': ROLES.CSKH,       // Chăm sóc dữ liệu
  'Truyền thông': ROLES.CSKH, // Truyền thông

  // FK roles  
  'FK': ROLES.FK,           // Phụ kính
  'FK-X': ROLES.FK          // Phụ kính X
};

/**
 * Lấy role từ groupCode
 * @param {string} groupCode - Mã nhóm của user
 * @returns {string|null} - Role tương ứng hoặc null nếu không tìm thấy
 */
function getRoleFromGroupCode(groupCode) {
  if (!groupCode) {
    return null;
  }
  
  return GROUP_TO_ROLE_MAP[groupCode] || null;
}

/**
 * Kiểm tra groupCode có hợp lệ hay không
 * @param {string} groupCode - Mã nhóm cần kiểm tra
 * @returns {boolean}
 */
function isValidGroupCode(groupCode) {
  return Object.keys(GROUP_TO_ROLE_MAP).includes(groupCode);
}

/**
 * Lấy danh sách tất cả groupCodes
 * @returns {Array} - Danh sách groupCodes
 */
function getAllGroupCodes() {
  return Object.keys(GROUP_TO_ROLE_MAP);
}

/**
 * Lấy danh sách groupCodes theo role
 * @param {string} role - Role cần tìm
 * @returns {Array} - Danh sách groupCodes có role tương ứng
 */
function getGroupCodesByRole(role) {
  return Object.keys(GROUP_TO_ROLE_MAP).filter(
    groupCode => GROUP_TO_ROLE_MAP[groupCode] === role
  );
}

/**
 * Ánh xạ ngược từ role sang groupCodes
 * @returns {Object} - Object có key là role, value là array groupCodes
 */
function getRoleToGroupsMap() {
  const roleToGroupsMap = {};
  
  Object.values(ROLES).forEach(role => {
    roleToGroupsMap[role] = getGroupCodesByRole(role);
  });
  
  return roleToGroupsMap;
}

module.exports = {
  GROUP_TO_ROLE_MAP,
  getRoleFromGroupCode,
  isValidGroupCode,
  getAllGroupCodes,
  getGroupCodesByRole,
  getRoleToGroupsMap
};
