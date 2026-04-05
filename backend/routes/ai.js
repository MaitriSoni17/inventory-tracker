const express = require('express');
const multer = require('multer');
const fetchuser = require('../middleware/fetchuser');
const AIDataFixProposal = require('../models/AIDataFixProposal');
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

const requireBusinessOwnerOrManager = (req, res, next) => {
  if (req.role === 'businessowner' || req.role === 'manager' || req.role === 'supervisor') {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Not authorized for AI insights operations.' });
};

const getBusinessOwnerId = (req) => (req.role === 'businessowner' ? req.user._id : req.businessowner || req.user.businessowner);

router.post('/demand-forecast', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await demandForecast(businessowner, req.body || {});
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate demand forecast.' });
  }
});

router.post('/auto-reorder', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await autoReorder(businessowner, req.body || {});
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate reorder plan.' });
  }
});

router.post('/anomalies', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
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

router.get('/supplier-intelligence', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await supplierIntelligence(businessowner);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate supplier intelligence.' });
  }
});

router.post('/conversational-bi/query', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const result = await conversationalBI(businessowner, req.body?.query);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to process conversational BI query.' });
  }
});

router.post('/ocr/invoice', fetchuser, requireBusinessOwnerOrManager, upload.single('file'), async (req, res) => {
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

router.get('/workflow-copilot', fetchuser, async (req, res) => {
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

router.get('/notifications/prioritized', fetchuser, async (req, res) => {
  try {
    const result = await prioritizeNotifications({ userId: req.user._id, role: req.role });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to prioritize notifications.' });
  }
});

router.post('/cash-forecast', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
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

router.post('/data-quality/scan', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
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

router.get('/data-quality/fix-proposals', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
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

router.post('/data-quality/fix-proposals/:id/approve', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
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

router.post('/data-quality/fix-proposals/:id/reject', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
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

router.post('/run-all', fetchuser, requireBusinessOwnerOrManager, async (req, res) => {
  try {
    const businessowner = getBusinessOwnerId(req);
    const senderRole = req.role === 'businessowner' ? 'BusinessOwner' : 'Employee';

    const result = await runAllAIInsights({
      businessowner,
      role: req.role,
      userId: req.user._id,
      actorId: req.user._id,
      actorRole: senderRole,
      options: req.body || {}
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to run complete AI insights suite.' });
  }
});

module.exports = router;
