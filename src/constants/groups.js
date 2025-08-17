/**
 * Groups Constants - Mapping groupCode và hiển thị
 */

// Mapping groupCode -> display label
export const GROUP_LABELS = {
  'TT': 'Tổ Trưởng',
  'PCQ': 'Phó Chủ quản',
  'CQ': 'Chủ quản',
  'XNK': 'Xuất nhập khoản',
  'CSKH': 'CSKH',
  'CSOL': 'CSKH Online',
  'CSDL': 'CS Đại lý',
  'Truyền thông': 'Truyền thông',
  'FK': 'FK',
  'FK-X': 'FK-X'
};

// Mapping groupCode -> role
export const GROUP_TO_ROLE = {
  'TT': 'ADMIN',
  'PCQ': 'ADMIN', 
  'CQ': 'ADMIN',
  'XNK': 'XNK',
  'CSKH': 'CSKH',
  'CSOL': 'CSKH',
  'CSDL': 'CSKH',
  'Truyền thông': 'CSKH',
  'FK': 'FK',
  'FK-X': 'FK'
};

// Mapping role -> display label
export const ROLE_LABELS = {
  'ADMIN': 'Quản trị viên',
  'XNK': 'Xuất nhập khoản',
  'CSKH': 'Chăm sóc khách hàng',
  'FK': 'Duyệt đơn'
};

// Mapping role -> color class
export const ROLE_COLORS = {
  'ADMIN': 'role-admin',
  'XNK': 'role-xnk',
  'CSKH': 'role-cskh',
  'FK': 'role-fk'
};

// Mapping groupCode -> color class
export const GROUP_COLORS = {
  'TT': 'group-admin',
  'PCQ': 'group-admin',
  'CQ': 'group-admin',
  'XNK': 'group-xnk',
  'CSKH': 'group-cskh',
  'CSOL': 'group-cskh',
  'CSDL': 'group-cskh',
  'Truyền thông': 'group-cskh',
  'FK': 'group-fk',
  'FK-X': 'group-fk'
};

// Roles list
export const ROLES = {
  ADMIN: 'ADMIN',
  XNK: 'XNK',
  CSKH: 'CSKH',
  FK: 'FK'
};

// Groups grouped by role để hiển thị trong UI
export const GROUPS_BY_ROLE = {
  [ROLES.ADMIN]: [
    { code: 'TT', label: GROUP_LABELS.TT },
    { code: 'PCQ', label: GROUP_LABELS.PCQ },
    { code: 'CQ', label: GROUP_LABELS.CQ }
  ],
  [ROLES.XNK]: [
    { code: 'XNK', label: GROUP_LABELS.XNK }
  ],
  [ROLES.CSKH]: [
    { code: 'CSKH', label: GROUP_LABELS.CSKH },
    { code: 'CSOL', label: GROUP_LABELS.CSOL },
    { code: 'CSDL', label: GROUP_LABELS.CSDL },
    { code: 'Truyền thông', label: GROUP_LABELS['Truyền thông'] }
  ],
  [ROLES.FK]: [
    { code: 'FK', label: GROUP_LABELS.FK },
    { code: 'FK-X', label: GROUP_LABELS['FK-X'] }
  ]
};

// Helper functions
export function getGroupLabel(groupCode) {
  return GROUP_LABELS[groupCode] || groupCode;
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export function getRoleByGroup(groupCode) {
  return GROUP_TO_ROLE[groupCode] || ROLES.FK;
}

export function getGroupsByRole(role) {
  return GROUPS_BY_ROLE[role] || [];
}

export function getRoleColor(role) {
  return ROLE_COLORS[role] || 'role-default';
}

export function getGroupColor(groupCode) {
  return GROUP_COLORS[groupCode] || 'group-default';
}

// Validation functions
export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

export function isValidGroup(groupCode) {
  return Object.keys(GROUP_LABELS).includes(groupCode);
}

// All groups as array for dropdowns
export const ALL_GROUPS = Object.keys(GROUP_LABELS).map(code => ({
  code,
  label: GROUP_LABELS[code],
  role: GROUP_TO_ROLE[code]
}));

// All roles as array for dropdowns
export const ALL_ROLES = Object.keys(ROLE_LABELS).map(role => ({
  value: role,
  label: ROLE_LABELS[role]
}));

export default {
  GROUP_LABELS,
  GROUP_TO_ROLE,
  ROLE_LABELS,
  ROLE_COLORS,
  GROUP_COLORS,
  ROLES,
  GROUPS_BY_ROLE,
  ALL_GROUPS,
  ALL_ROLES,
  getGroupLabel,
  getRoleLabel,
  getRoleByGroup,
  getGroupsByRole,
  getRoleColor,
  getGroupColor,
  isValidRole,
  isValidGroup
};
