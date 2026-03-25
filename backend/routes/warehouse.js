const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Products');
const Employee = require('../models/Employee');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { hasPermission } = require('../middleware/roleBasedAccess');

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

// Create Warehouse — permission-based access
// NOTE: wManager is a string (manager name) and not a required reference to Employee
// This solves the circular dependency: you can create warehouse without needing pre-existing employee
router.post('/createwarehouse', fetchuser, [
    body('wName', 'Enter Warehouse Name').exists(),
    body('wManager', 'Warehouse Manager Name').optional(),
    body('wAddress', 'Enter Warehouse Address').exists(),
    body('wContact').exists().custom((value) => {
        if (!isValidPhoneNumber(value)) {
            throw new Error('Enter a valid 10-digit warehouse contact number');
        }
        return true;
    }),
    body('wEmail', 'Enter Warehouse Email').exists().isEmail(),
], async (req, res) => {
    // Check permission to create warehouses
    if (!hasPermission(req.user, 'canCreateWarehouse')) {
        return res.status(403).json({ error: "You do not have permission to create warehouses" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { wName, wManager, wAddress, wContact, wEmail, city, state, country, managerId, wManagerId } = req.body;

    try {
        let warehouseData = { wName, wAddress, wContact, wEmail, city, state, country };

        if (req.role === 'businessowner') {
            warehouseData.businessowner = req.user._id;
        } else {
            warehouseData.businessowner = req.user.businessowner;
            warehouseData.employee = req.user._id;
        }

        // Handle manager selection from dropdown (wManagerId) or managerId parameter
        const managerId_final = wManagerId || managerId;
        if (managerId_final) {
            const Employee = require('../models/Employee');
            const manager = await Employee.findById(managerId_final);
            if (manager && manager.role === 'manager') {
                warehouseData.employee = managerId_final;
                warehouseData.wManager = `${manager.fname} ${manager.lname}`;
            }
        } else if (wManager) {
            // If only wManager name is provided (text input fallback)
            warehouseData.wManager = wManager;
        }

        const warehouse = await Warehouse.create(warehouseData);
        res.json({ warehouse, success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Warehouse — permission-based access (view-only)
router.post('/getwarehouse', fetchuser, async (req, res) => {
    // Check permission to view warehouses
    // Also allow users with product permissions (they need warehouse list for product forms)
    if (!hasPermission(req.user, 'canViewWarehouses') && 
        !hasPermission(req.user, 'canViewProducts') && 
        !hasPermission(req.user, 'canCreateProducts') && 
        !hasPermission(req.user, 'canEditProducts')) {
        return res.status(403).json({ error: "You do not have permission to view warehouses" });
    }

    try {
        let warehouse = [];

        if (req.role === 'businessowner') {
            // Business owner sees all warehouses
            warehouse = await Warehouse.find({ businessowner: req.user._id });
        } else {
            // All employee-type roles see all warehouses in the business
            warehouse = await Warehouse.find({ businessowner: req.user.businessowner });
        }

        const warehouseIds = warehouse.map((w) => w._id.toString());
        const warehouseObjectIds = warehouse.map((w) => w._id);

        const productCounts = await Product.aggregate([
            { $match: { warehouse: { $exists: true, $ne: [] } } },
            { $unwind: '$warehouse' },
            { $match: { warehouse: { $in: warehouseIds } } },
            { $group: { _id: '$warehouse', totalProductsCount: { $sum: 1 } } }
        ]);

        const productCountMap = productCounts.reduce((acc, item) => {
            acc[item._id] = item.totalProductsCount;
            return acc;
        }, {});

        const employeeCounts = await Employee.aggregate([
            { $match: { warehouse: { $in: warehouseObjectIds } } },
            { $group: { _id: '$warehouse', totalEmployeesCount: { $sum: 1 } } }
        ]);

        const employeeCountMap = employeeCounts.reduce((acc, item) => {
            acc[item._id.toString()] = item.totalEmployeesCount;
            return acc;
        }, {});

        const warehouseWithCounts = warehouse.map((w) => {
            const plainWarehouse = w.toObject();
            plainWarehouse.totalProductsCount = productCountMap[w._id.toString()] || 0;
            plainWarehouse.totalEmployeesCount = employeeCountMap[w._id.toString()] || 0;
            return plainWarehouse;
        });

        res.json(warehouseWithCounts);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Warehouse — permission-based access
router.put('/updatewarehouse/:id', fetchuser, [
    body('wName', 'Enter Warehouse Name').exists(),
    body('wManager', 'Warehouse Manager Name').optional(),
    body('wAddress', 'Enter Warehouse Address').exists(),
    body('wContact').exists().custom((value) => {
        if (!isValidPhoneNumber(value)) {
            throw new Error('Enter a valid 10-digit warehouse contact number');
        }
        return true;
    }),
    body('wEmail', 'Enter Warehouse Email').exists().isEmail(),
], async (req, res) => {
    // Check permission to edit warehouses
    if (!hasPermission(req.user, 'canEditWarehouse')) {
        return res.status(403).json({ error: "You do not have permission to update warehouses" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { wName, wManager, wAddress, wContact, wEmail, city, state, country, wManagerId } = req.body;

    try {
        const newWarehouse = { wName, wAddress, wContact, wEmail, city, state, country };

        let warehouse = await Warehouse.findById(req.params.id);
        if (!warehouse) return res.status(404).send("Not Found");

        // Handle manager selection from dropdown (wManagerId) or wManager text
        if (wManagerId) {
            const Employee = require('../models/Employee');
            const manager = await Employee.findById(wManagerId);
            if (manager && manager.role === 'manager') {
                newWarehouse.employee = wManagerId;
                newWarehouse.wManager = `${manager.fname} ${manager.lname}`;
            }
        } else if (wManager) {
            // If only wManager name is provided (text input fallback)
            newWarehouse.wManager = wManager;
            newWarehouse.employee = undefined;
        } else {
            // If nothing provided, keep as is or clear
            newWarehouse.wManager = undefined;
            newWarehouse.employee = undefined;
        }

        // Verify ownership
        if (req.role === 'businessowner') {
            if (warehouse.businessowner.toString() !== req.user._id.toString()) {
                return res.status(403).send("Access denied");
            }
        } else {
            if (warehouse.businessowner.toString() !== req.user.businessowner.toString()) {
                return res.status(403).send("Access denied");
            }
        }

        warehouse = await Warehouse.findByIdAndUpdate(req.params.id, { $set: newWarehouse }, { new: true });
        res.json({ warehouse, success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Managers — fetch list of available managers for warehouse assignment
router.post('/getmanagers', fetchuser, async (req, res) => {
    try {
        const Employee = require('../models/Employee');
        let managers = [];

        if (req.role === 'businessowner') {
            // Business owner can see all managers in their business
            managers = await Employee.find({ 
                businessowner: req.user._id,
                role: 'manager'
            }).select('_id fname lname email');
        } else {
            // All employee-type roles can see managers in the business
            managers = await Employee.find({ 
                businessowner: req.user.businessowner,
                role: 'manager'
            }).select('_id fname lname email');
        }

        res.json(managers);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Warehouse — permission-based access
router.delete('/deletewarehouse/:id', fetchuser, async (req, res) => {
    // Check permission to delete warehouses
    if (!hasPermission(req.user, 'canDeleteWarehouse')) {
        return res.status(403).json({ error: "You do not have permission to delete warehouses" });
    }

    try {
        const warehouse = await Warehouse.findById(req.params.id);
        if (!warehouse) return res.status(404).send("Not Found");

        // Verify ownership
        if (req.role === 'businessowner') {
            if (warehouse.businessowner.toString() !== req.user._id.toString()) {
                return res.status(403).send("Access denied");
            }
        } else {
            if (warehouse.businessowner.toString() !== req.user.businessowner.toString()) {
                return res.status(403).send("Access denied");
            }
        }

        await Warehouse.findByIdAndDelete(req.params.id);
        res.json({ message: "Warehouse deleted successfully", success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;

