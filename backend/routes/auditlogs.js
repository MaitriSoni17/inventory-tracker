const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const AuditLog = require('../models/AuditLog');
const { hasPermission } = require('../middleware/roleBasedAccess');

const router = express.Router();

// Fetch audit logs with pagination and filters
router.post('/list', fetchuser, async (req, res) => {
  const canViewAudit = req.role === 'businessowner' || hasPermission(req.user, 'canViewAnalytics') || hasPermission(req.user, 'canExportReports');
  if (!canViewAudit) {
    return res.status(403).json({ error: 'You do not have permission to view audit logs' });
  }

  try {
    const page = Math.max(parseInt(req.body.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.body.limit, 10) || 20, 1), 100);
    const businessOwnerId = req.role === 'businessowner' ? req.user._id : req.user.businessowner;

    const filter = { businessowner: businessOwnerId };

    if (req.body.entityType) {
      filter.entityType = String(req.body.entityType).trim();
    }
    if (req.body.action) {
      filter.action = String(req.body.action).trim();
    }
    if (req.body.actorRole) {
      filter.actorRole = String(req.body.actorRole).trim();
    }

    if (req.body.from || req.body.to) {
      filter.createdAt = {};
      if (req.body.from) {
        const from = new Date(req.body.from);
        if (!Number.isNaN(from.getTime())) filter.createdAt.$gte = from;
      }
      if (req.body.to) {
        const to = new Date(req.body.to);
        if (!Number.isNaN(to.getTime())) filter.createdAt.$lte = to;
      }
      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    const [data, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server error occurred' });
  }
});

module.exports = router;
