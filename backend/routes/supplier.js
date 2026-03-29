const express = require('express');
const Supplier = require('../models/Supplier');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser'); // unified middleware
const { body, validationResult } = require('express-validator');
const { notifyBusinessOwnerAboutSupplier } = require('../utils/notificationHelper');

const isValidPhoneNumber = (value) => {
  if (!value) return false;
  const cleanValue = String(value).replace(/[^\d+]/g, '');

  // India: +91 followed by 10 digits, first digit 6,7,8,9
  const indiaRegex = /^\+91[6789]\d{9}$/;

  // USA/Canada: +1 followed by 10 digits, area code not starting with 0 or 1
  const usCanadaRegex = /^\+1[2-9]\d{2}\d{6}$/;

  // UK: +44 followed by 10-11 digits
  // Mobile: +447 followed by 9 digits (11 total)
  // Landline: +44 followed by 10 digits
  const ukMobileRegex = /^\+447\d{9}$/;
  const ukLandlineRegex = /^\+44\d{10}$/;

  // China: +86 followed by 11 digits, mobile starts with 1
  const chinaMobileRegex = /^\+861\d{10}$/;

  // Germany: +49 followed by 10-11 digits
  // Mobile: +49 followed by 10-11 digits starting with 15,16,17
  const germanyMobileRegex = /^\+49(15|16|17)\d{8,9}$/;
  const germanyLandlineRegex = /^\+49\d{10,11}$/;

  // Australia: +61 followed by 9 digits, mobile starts with 4
  const australiaMobileRegex = /^\+614\d{8}$/;
  const australiaLandlineRegex = /^\+61\d{9}$/;

  // Plain 10-digit Indian number (legacy support)
  const plainIndianRegex = /^[6789]\d{9}$/;

  return indiaRegex.test(cleanValue) ||
         usCanadaRegex.test(cleanValue) ||
         ukMobileRegex.test(cleanValue) ||
         ukLandlineRegex.test(cleanValue) ||
         chinaMobileRegex.test(cleanValue) ||
         germanyMobileRegex.test(cleanValue) ||
         germanyLandlineRegex.test(cleanValue) ||
         australiaMobileRegex.test(cleanValue) ||
         australiaLandlineRegex.test(cleanValue) ||
         plainIndianRegex.test(cleanValue);
};

const JWT_SECRET = process.env.JWT_SECRET || 'ThisisaSecretKey';

// Create an Supplier using: POST "/api/supplier/createsupplier". Business Owner login required
const fetchbusinessowner = require('../middleware/fetchbusinessowner');

router.post('/createsupplier', fetchbusinessowner, [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
    body('phone').optional({ checkFalsy: true }).custom((value) => {
        if (!isValidPhoneNumber(value)) {
            throw new Error('Enter a valid 10-digit phone number');
        }
        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let supplier = await Supplier.findOne({ email: req.body.email });
        if (supplier) {
            return res.status(400).json({ error: "Sorry, a user with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        supplier = await Supplier.create({
            businessowner: req.businessowner._id,
            fname: req.body.fname,
            lname: req.body.lname,
            email: req.body.email,
            password: secPass,
            ...(req.body.jDate && { jDate: req.body.jDate }),
            nationality: req.body.nationality,
            country: req.body.country,
            state: req.body.state,
            city: req.body.city,
            phone: req.body.phone,
            address: req.body.address,
            about: req.body.about,
            role: 'supplier'
        });

        const authToken = jwt.sign({ id: supplier._id, role: 'supplier', tokenVersion: supplier.tokenVersion || 0 }, JWT_SECRET);
        res.json({ authToken, success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Supplier Data using: POST "/api/supplier/getsupplier". Login required
router.post('/getsupplier', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "Access denied" });
        }

        const supplier = await Supplier.findById(req.user._id).select("-password");
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        res.json(supplier);
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Get Supplier Data by ID using: POST "/api/supplier/getsupplier/:id". Login required
router.post('/getsupplier/:id', fetchuser, async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id).select("-password");
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        res.json(supplier);
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Get All Suppliers using: POST "/api/supplier/getallsuppliers". Business Owner, Manager, Supervisor, Employee or Supplier login required
router.post('/getallsuppliers', require('../middleware/fetchuser'), async (req, res) => {
    try {
        // Business owner can view their suppliers
        if (req.role === 'businessowner') {
            const suppliers = await Supplier.find({ businessowner: req.user._id }).select('-password');
            return res.json(suppliers);
        }
        
        // All employee-type roles can view suppliers of their business owner
        if (req.role !== 'businessowner' && req.role !== 'supplier') {
            const suppliers = await Supplier.find({ businessowner: req.user.businessowner }).select('-password');
            return res.json(suppliers);
        }

        // Suppliers can view other suppliers of the same business owner
        if (req.role === 'supplier') {
            const suppliers = await Supplier.find({ businessowner: req.user.businessowner }).select('-password');
            return res.json(suppliers);
        }
        
        return res.status(403).json({ error: "You do not have permission to view suppliers" });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Update Supplier using: PUT "/api/supplier/updatesupplier/:id". Business Owner login required
router.put('/updatesupplier/:id', require('../middleware/fetchbusinessowner'), [
    body('phone').optional({ checkFalsy: true }).custom((value) => {
        if (!isValidPhoneNumber(value)) {
            throw new Error('Enter a valid 10-digit phone number');
        }
        return true;
    }),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { fname, lname, phone, nationality, country, state, city, address, about } = req.body;

        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Check if supplier belongs to this business owner
        if (supplier.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Update fields
        if (fname) supplier.fname = fname;
        if (lname) supplier.lname = lname;
        if (phone) supplier.phone = phone;
        if (nationality) supplier.nationality = nationality;
        if (country) supplier.country = country;
        if (state) supplier.state = state;
        if (city) supplier.city = city;
        if (address) supplier.address = address;
        if (about) supplier.about = about;

        await supplier.save();
        res.json({ supplier, success: true });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Delete Supplier using: DELETE "/api/supplier/deletesupplier/:id". Business Owner login required
router.delete('/deletesupplier/:id', require('../middleware/fetchbusinessowner'), async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Check if supplier belongs to this business owner
        if (supplier.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        await Supplier.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Supplier deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Update own profile using: PUT "/api/supplier/updatesupplier". Supplier login required
router.put('/updatesupplier', fetchuser, [
    body('phone').optional({ checkFalsy: true }).custom((value) => {
        if (!isValidPhoneNumber(value)) {
            throw new Error('Enter a valid 10-digit phone number');
        }
        return true;
    }),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "Access denied" });
        }

        const { fname, lname, phone, email, country, state, city, pincode, address } = req.body;
        const supplier = await Supplier.findById(req.user._id);
        
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Update fields
        if (fname) supplier.fname = fname;
        if (lname) supplier.lname = lname;
        if (phone) supplier.phone = phone;
        if (email) supplier.email = email;
        if (country) supplier.country = country;
        if (state) supplier.state = state;
        if (city) supplier.city = city;
        if (pincode) supplier.pincode = pincode;
        if (address) supplier.address = address;

        await supplier.save();
        res.json({ supplier: supplier.toObject({ getters: true }), success: true });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Change password using: PUT "/api/supplier/changepassword". Supplier login required
router.put('/changepassword', fetchuser, [
    body('currentPassword', 'Current password is required').exists(),
    body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "Access denied" });
        }

        const { currentPassword, newPassword } = req.body;
        const supplier = await Supplier.findById(req.user._id);

        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, supplier.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        supplier.password = await bcrypt.hash(newPassword, salt);
        supplier.tokenVersion = (supplier.tokenVersion || 0) + 1;
        supplier.mustChangePassword = false;
        await supplier.save();

        res.json({ success: true, message: "Password changed successfully" });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Reset supplier password using: PUT "/api/supplier/resetpassword/:id". Business Owner login required
router.put('/resetpassword/:id', fetchbusinessowner, [
    body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Ensure supplier belongs to this business owner
        if (supplier.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        const salt = await bcrypt.genSalt(10);
        supplier.password = await bcrypt.hash(req.body.newPassword, salt);
        supplier.tokenVersion = (supplier.tokenVersion || 0) + 1;
        supplier.mustChangePassword = true;
        await supplier.save();

        res.json({ success: true, message: "Supplier password reset successfully" });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Deactivate account using: POST "/api/supplier/deactivate". Supplier login required
router.post('/deactivate', fetchuser, async (req, res) => {
    try {
        if (req.role !== 'supplier') {
            return res.status(403).json({ error: "Access denied" });
        }

        const supplier = await Supplier.findById(req.user._id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        supplier.isActive = false;
        await supplier.save();

        // Notify business owner about supplier deactivation
        try {
            await notifyBusinessOwnerAboutSupplier(
                supplier.businessowner,
                supplier._id,
                'deactivated',
                supplier.fname,
                { supplierId: supplier._id }
            );
        } catch (notifError) {
            // Continue even if notification fails
        }

        res.json({ success: true, message: "Account deactivated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Deactivate a supplier account by business owner: PUT "/api/supplier/deactivate/:supplierId"
router.put('/deactivate/:supplierId', require('../middleware/fetchbusinessowner'), async (req, res) => {
    try {
        const { supplierId } = req.params;

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Verify the supplier belongs to this business owner
        if (supplier.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (supplier.isActive === false) {
            return res.status(400).json({ error: "Supplier account is already inactive" });
        }

        supplier.isActive = false;
        await supplier.save();

        // Notify business owner about deactivation
        try {
            await notifyBusinessOwnerAboutSupplier(
                supplier.businessowner,
                supplier._id,
                'deactivated',
                supplier.fname,
                { supplierId: supplier._id, action: 'deactivated_by_owner' }
            );
        } catch (notifError) {
            // Continue even if notification fails
        }

        res.json({ success: true, message: "Supplier account deactivated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Reactivate a supplier account: PUT "/api/supplier/reactivate/:supplierId"
router.put('/reactivate/:supplierId', require('../middleware/fetchbusinessowner'), async (req, res) => {
    try {
        const { supplierId } = req.params;

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Verify the supplier belongs to this business owner
        if (supplier.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (supplier.isActive === true) {
            return res.status(400).json({ error: "Supplier account is already active" });
        }

        supplier.isActive = true;
        await supplier.save();

        // Notify business owner about reactivation
        try {
            await notifyBusinessOwnerAboutSupplier(
                supplier.businessowner,
                supplier._id,
                'updated',
                supplier.fname,
                { supplierId: supplier._id, action: 'reactivated' }
            );
        } catch (notifError) {
            // Continue even if notification fails
        }

        res.json({ success: true, message: "Supplier account reactivated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// ==================== SUPPLIER PERMISSIONS MANAGEMENT ====================

// Get all suppliers with their permissions (Business Owner only)
router.get('/permissions/list', require('../middleware/fetchbusinessowner'), async (req, res) => {
    try {
        const suppliers = await Supplier.find({ businessowner: req.businessowner._id })
            .select('_id fname lname email companyName canExportReports canMessage isActive');
        
        res.json({
            success: true,
            suppliers: suppliers.map(s => ({
                _id: s._id,
                fname: s.fname,
                lname: s.lname,
                email: s.email,
                companyName: s.companyName,
                canExportReports: s.canExportReports || false,
                canMessage: s.canMessage || false,
                isActive: s.isActive
            }))
        });
    } catch (err) {
        // console.error('Error fetching supplier permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Update supplier's export permission (Business Owner only)
router.put('/permissions/update/:supplierId', require('../middleware/fetchbusinessowner'), async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { canExportReports, canMessage } = req.body;

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }

        // Check if supplier belongs to this business owner
        if (supplier.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (canExportReports !== undefined) supplier.canExportReports = canExportReports;
        if (canMessage !== undefined) supplier.canMessage = canMessage;
        await supplier.save();

        const updatedField = canMessage !== undefined ? 'Messaging' : 'Export reports';
        const updatedValue = canMessage !== undefined ? canMessage : canExportReports;

        res.json({
            success: true,
            message: `${updatedField} permission ${updatedValue ? 'enabled' : 'disabled'} for ${supplier.fname} ${supplier.lname || ''}`,
            supplier: {
                _id: supplier._id,
                fname: supplier.fname,
                lname: supplier.lname,
                canExportReports: supplier.canExportReports,
                canMessage: supplier.canMessage
            }
        });
    } catch (err) {
        // console.error('Error updating supplier permission:', err);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Bulk update supplier permissions (Business Owner only)
router.put('/permissions/bulk-update', require('../middleware/fetchbusinessowner'), async (req, res) => {
    try {
        const { supplierIds, canExportReports, canMessage } = req.body;

        if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
            return res.status(400).json({ error: "Please provide an array of supplier IDs" });
        }

        const updateFields = {};
        if (canExportReports !== undefined) updateFields.canExportReports = canExportReports;
        if (canMessage !== undefined) updateFields.canMessage = canMessage;

        // Update all suppliers that belong to this business owner
        const result = await Supplier.updateMany(
            {
                _id: { $in: supplierIds },
                businessowner: req.businessowner._id
            },
            { $set: updateFields }
        );

        const updatedField = canMessage !== undefined ? 'Messaging' : 'Export reports';
        const updatedValue = canMessage !== undefined ? canMessage : canExportReports;

        res.json({
            success: true,
            message: `${updatedField} permission ${updatedValue ? 'enabled' : 'disabled'} for ${result.modifiedCount} supplier(s)`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        // console.error('Error bulk updating supplier permissions:', err);
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

module.exports = router;

