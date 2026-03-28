const BusinessOwner = require('../models/BusinessOwner');
const DeletionRequest = require('../models/DeletionRequest');
const LoginInfo = require('../models/LoginInfo');
const { cascadeDeleteBusinessOwner } = require('./cascadeDelete');

const PROCESS_INTERVAL_MS = Number(process.env.DELETION_PROCESS_INTERVAL_MS || 60 * 1000);

let processing = false;

const processBusinessOwnerDeletion = async (deletionRequest) => {
  const businessOwnerId = deletionRequest.userId;

  const businessOwner = await BusinessOwner.findById(businessOwnerId);
  if (!businessOwner) {
    await DeletionRequest.deleteOne({ _id: deletionRequest._id });
    return;
  }

  await cascadeDeleteBusinessOwner(businessOwnerId);
  await BusinessOwner.deleteOne({ _id: businessOwnerId });

  if (deletionRequest.userEmail) {
    await LoginInfo.deleteMany({ email: deletionRequest.userEmail, role: 'businessowner' });
  }
};

const processDueDeletionRequests = async () => {
  if (processing) {
    return;
  }

  processing = true;

  try {
    const dueRequests = await DeletionRequest.find({
      userRole: 'businessowner',
      status: 'approved',
      scheduledDeletionDate: { $lte: new Date() }
    }).sort({ scheduledDeletionDate: 1 });

    for (const deletionRequest of dueRequests) {
      try {
        await processBusinessOwnerDeletion(deletionRequest);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Business owner deletion processing failed:', err.message);
      }
    }
  } finally {
    processing = false;
  }
};

const startDeletionProcessor = () => {
  processDueDeletionRequests().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Initial deletion processor run failed:', err.message);
  });

  setInterval(() => {
    processDueDeletionRequests().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Deletion processor run failed:', err.message);
    });
  }, PROCESS_INTERVAL_MS);
};

module.exports = {
  startDeletionProcessor,
  processDueDeletionRequests
};
