// Central role and permission definitions for the whole API.
// Routes should depend on permissions, not on hard-coded role lists.

const ROLES = {
  ADMIN: 'ADMIN',
  CUSTOMS_OFFICER: 'CUSTOMS_OFFICER',
  QUAY_OPERATOR: 'QUAY_OPERATOR',
  IMPORTER: 'IMPORTER'
}

const PERMISSIONS = {
  USER_MANAGE: 'user:manage',
  USER_RESET_PASSWORD: 'user:reset-password',
  SETTINGS_READ: 'settings:read',
  SETTINGS_MANAGE: 'settings:manage',
  IMPORTER_CREATE: 'importer:create',
  IMPORTER_READ: 'importer:read',
  IMPORTER_UPDATE: 'importer:update',
  IMPORTER_DELETE: 'importer:delete',
  VERIFICATION_CREATE: 'verification:create',
  VERIFICATION_REVIEW: 'verification:review',
  BOOKING_CREATE: 'booking:create',
  BOOKING_READ: 'booking:read',
  BOOKING_STATUS_UPDATE: 'booking:status-update',
  BOOKING_CANCEL: 'booking:cancel'
}

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.CUSTOMS_OFFICER]: [
    PERMISSIONS.IMPORTER_CREATE,
    PERMISSIONS.IMPORTER_READ,
    PERMISSIONS.VERIFICATION_REVIEW,
    PERMISSIONS.BOOKING_READ
  ],
  [ROLES.QUAY_OPERATOR]: [
    PERMISSIONS.IMPORTER_READ,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_STATUS_UPDATE
  ],
  [ROLES.IMPORTER]: [
    PERMISSIONS.IMPORTER_CREATE,
    PERMISSIONS.IMPORTER_READ,
    PERMISSIONS.IMPORTER_UPDATE,
    PERMISSIONS.VERIFICATION_CREATE,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ
  ]
}

// Roles that must protect their account with a second factor.
const MFA_REQUIRED_ROLES = [ROLES.ADMIN]

// Roles a user may pick when self-registering. Privileged roles are assigned by an admin.
const SELF_REGISTRATION_ROLES = [ROLES.IMPORTER]

function isRole(role){
  return Object.prototype.hasOwnProperty.call(ROLES, role)
}

function permissionsFor(role){
  return ROLE_PERMISSIONS[role] || []
}

function roleHasPermission(role, permission){
  return permissionsFor(role).includes(permission)
}

function requiresMfa(role){
  return MFA_REQUIRED_ROLES.includes(role)
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  MFA_REQUIRED_ROLES,
  SELF_REGISTRATION_ROLES,
  isRole,
  permissionsFor,
  roleHasPermission,
  requiresMfa
}
