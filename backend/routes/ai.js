const express = require('express');
const multer = require('multer');
const fetchuser = require('../middleware/fetchuser');
const AIDataFixProposal = require('../models/AIDataFixProposal');
const AIInsightSnapshot = require('../models/AIInsightSnapshot');
const { hasPermission } = require('../middleware/roleBasedAccess');
const {
  demandForecast,
  autoReorder,
  detectInventoryAnomalies,
  createAnomalyNotifications,
  supplierIntelligence,
  conversationalBI,
  invoiceOCR,
  workflowCopilot,
  prioritizeNotifications,
  cashForecast,
  dataQualityGuardrails,
  applyApprovedFixProposal,
  runAllAIInsights
} = require('../services/aiInsightsService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

const supplierPermissionMap = {
  canViewDashboard: true,
  canViewNotifications: true,
  canViewMessages: true,
  canSendMessages: (user) => Boolean(user?.canMessage),
  canExportReports: (user) => Boolean(user?.canExportReports)
};

const aiSectionRules = {
  demandForecast: { permissions: ['canViewProducts'] },
  autoReorder: { permissions: ['canViewProducts'] },
  anomalyDetection: { permissions: ['canViewProducts'] },
  supplierIntelligence: { permissions: ['canViewOrders'] },
  workflowCopilot: { permissions: ['canViewDashboard'] },
  prioritizedNotifications: { permissions: ['canViewNotifications'] },
  cashAndProfitForecast: { permissions: ['canViewAnalytics'] },
  dataQualityGuardrails: { permissions: ['canViewAnalytics'] },
  conversationalBi: { permissions: ['canViewAnalytics', 'canViewProducts'] }
};

const getPermissionState = (req, permission) => {
  if (req.role === 'businessowner') return true;

  if (req.role === 'supplier') {
    const supplierPermission = supplierPermissionMap[permission];
    if (typeof supplierPermission === 'function') return supplierPermission(req.user);
    return Boolean(supplierPermission);
  }

  return hasPermission(req.user, permission);
};

const getBusinessOwnerId = (req) => (req.role === 'businessowner' ? req.user._id : req.businessowner || req.user.businessowner);

const canViewAiSection = (req, sectionKey) => {
  const rule = aiSectionRules[sectionKey];
  if (!rule) return false;

  const requiredPermissions = rule.permissions || [];
  return requiredPermissions.every((permission) => getPermissionState(req, permission));
};

const getAllowedAiSections = (req) => Object.keys(aiSectionRules).filter((sectionKey) => canViewAiSection(req, sectionKey));

const requireAiSectionAccess = (sectionKey) => (req, res, next) => {
  if (canViewAiSection(req, sectionKey)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: `Not authorized to access ${sectionKey} insights.`
  });
};

const filterAiInsightsForUser = (req, insights = {}) => {
  const allowedSections = Object.keys(insights).filter((key) => canViewAiSection(req, key));
  return allowedSections.reduce((filtered, key) => {
    filtered[key] = insights[key];
    return filtered;
  }, { generatedAt: insights.generatedAt, allowedSections });
};

const saveLatestSnapshotForUser = async (req, insights) => {
  const businessowner = getBusinessOwnerId(req);
  if (!businessowner || !req.user?._id || !insights) return;

  const generatedAt = insights.generatedAt ? new Date(insights.generatedAt) : new Date();

  await AIInsightSnapshot.findOneAndUpdate(
    {
      businessowner,
      user: req.user._id,
      role: req.role
    },
    {
      $set: {
        generatedAt,
        insights
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

router.get('/latest-insights', fetchuser, async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const snapshot = await AIInsightSnapshot.findOne({
      businessowner,
      user: req.user._id,
      role: req.role
    }).select('generatedAt insights');

    if (!snapshot) {
      return res.json({ success: true, hasSnapshot: false, insights: null });
    }

    return res.json({
      success: true,
      hasSnapshot: true,
      generatedAt: snapshot.generatedAt,
      insights: snapshot.insights
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch latest AI insights snapshot.' });
  }
});

router.post('/demand-forecast', fetchuser, requireAiSectionAccess('demandForecast'), async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await demandForecast(businessowner, req.body || {});
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate demand forecast.' });
  }
});

router.post('/auto-reorder', fetchuser, requireAiSectionAccess('autoReorder'), async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await autoReorder(businessowner, req.body || {});
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate reorder plan.' });
  }
});

router.post('/anomalies', fetchuser, requireAiSectionAccess('anomalyDetection'), async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await detectInventoryAnomalies(businessowner, req.body || {});

    let notifications = [];
    if (req.body?.notify === true) {
      const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : 'Employee';
      notifications = await createAnomalyNotifications({
        businessowner,
        actorId: req.user._id,
        actorRole: senderRole,
        anomalies: result.anomalies
      });
    }

    return res.json({
      success: true,
      ...result,
      notificationCount: notifications.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to detect anomalies.' });
  }
});

router.get('/supplier-intelligence', fetchuser, requireAiSectionAccess('supplierIntelligence'), async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await supplierIntelligence(businessowner);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate supplier intelligence.' });
  }
});

router.post('/conversational-bi/query', fetchuser, requireAiSectionAccess('conversationalBi'), async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await conversationalBI(businessowner, req.body?.query);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to process conversational BI query.' });
  }
});

router.post('/ocr/invoice', fetchuser, requireAiSectionAccess('supplierIntelligence'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Invoice file is required.' });
    }

    const businessowner = getBusinessOwnerId(req);
    const result = await invoiceOCR({
      file: req.file,
      expectedSupplierOrderId: req.body?.supplierOrderId,
      businessowner
    });

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to process invoice OCR.' });
  }
});

router.get('/workflow-copilot', fetchuser, requireAiSectionAccess('workflowCopilot'), async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await workflowCopilot({
      businessowner,
      role: req.role,
      userId: req.user._id
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate workflow copilot actions.' });
  }
});

router.get('/notifications/prioritized', fetchuser, requireAiSectionAccess('prioritizedNotifications'), async (req, res) => {
  try {
    const result = await prioritizeNotifications({ userId: req.user._id, role: req.role });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to prioritize notifications.' });
  }
});

router.post('/cash-forecast', fetchuser, requireAiSectionAccess('cashAndProfitForecast'), async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await cashForecast({
      businessowner,
      days: req.body?.days,
      reorderMultiplier: req.body?.reorderMultiplier
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to compute cash forecast.' });
  }
});

router.post('/data-quality/scan', fetchuser, requireAiSectionAccess('dataQualityGuardrails'), async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : 'Employee';
    const result = await dataQualityGuardrails({
      businessowner,
      actorId: req.user._id,
      actorRole: senderRole,
      createFixProposals: req.body?.createFixProposals !== false
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to run data quality scan.' });
  }
});

router.get('/data-quality/fix-proposals', fetchuser, requireAiSectionAccess('dataQualityGuardrails'), async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const status = req.query.status || 'pending';
    const proposals = await AIDataFixProposal.find({ businessowner, status })
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({ success: true, count: proposals.length, proposals });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch fix proposals.' });
  }
});

router.post('/data-quality/fix-proposals/:id/approve', fetchuser, requireAiSectionAccess('dataQualityGuardrails'), async (req, res) => {
  try {
    const applyResult = await applyApprovedFixProposal({
      proposalId: req.params.id,
      reviewerId: req.user._id
    });

    const statusCode = applyResult.success ? 200 : 400;
    return res.status(statusCode).json(applyResult);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to approve/apply fix proposal.' });
  }
});

router.post('/data-quality/fix-proposals/:id/reject', fetchuser, requireAiSectionAccess('dataQualityGuardrails'), async (req, res) => {
  try {
    const proposal = await AIDataFixProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found.' });
    }

    proposal.status = 'rejected';
    proposal.reviewedBy = req.user._id;
    proposal.reviewedAt = new Date();
    proposal.notes = req.body?.notes || '';
    await proposal.save();

    return res.json({ success: true, proposal });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to reject fix proposal.' });
  }
});

router.post('/run-all', fetchuser, async (req, res) => {
  try {
    const allowedSections = getAllowedAiSections(req).filter((sectionKey) => sectionKey !== 'conversationalBi');
    if (allowedSections.length === 0) {
      return res.status(403).json({ success: false, error: 'No AI insight sections are permitted for this account.' });
    }

    const businessowner = getBusinessOwnerId(req);
    const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : 'Employee';

    const result = await runAllAIInsights({
      businessowner,
      role: req.role,
      userId: req.user._id,
      actorId: req.user._id,
      actorRole: senderRole,
      options: {
        ...(req.body || {}),
        includeSections: allowedSections
      }
    });

    const filteredInsights = filterAiInsightsForUser(req, result);
    await saveLatestSnapshotForUser(req, filteredInsights);

    return res.json({ success: true, ...filteredInsights });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to run complete AI insights suite.' });
  }
});

module.exports = router;
