const AuditLog = require('../models/AuditLog');

const getIpAddress = (req) => {
  if (!req) return undefined;
  const forwardedFor = req.headers && req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip;
};

const toSafeObject = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return {};
  return metadata;
};

const logAuditEvent = async ({
  req,
  businessowner,
  action,
  entityType,
  entityId,
  summary,
  metadata = {}
}) => {
  try {
    if (!businessowner || !action || !entityType || !summary) return null;

    const actor = req && req.user ? req.user : null;
    if (!actor || !actor._id) return null;

    return await AuditLog.create({
      businessowner,
      actorId: actor._id,
      actorRole: req.role || actor.role || 'unknown',
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      summary,
      metadata: toSafeObject(metadata),
      ipAddress: getIpAddress(req),
      userAgent: req && req.headers ? req.headers['user-agent'] : undefined
    });
  } catch (error) {
    return null;
  }
};

module.exports = {
  logAuditEvent
};
