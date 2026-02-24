const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Category = require('../models/Category');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { notifyEmployeesAboutCategory, notifyBusinessOwnerAboutCategory } = require('../utils/notificationHelper');
const { hasPermission } = require('../middleware/roleBasedAccess');

// Create Category — permission-based access
router.post('/createcategory', fetchuser, [
    body('cName', 'Enter Category Name').exists(),
    body('cDesc', 'Enter Category Description').exists(),
], async (req, res) => {
    // Check permission to create categories
    if (!hasPermission(req.user, 'canCreateCategory')) {
        return res.status(403).json({ error: "You do not have permission to create categories" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cName, cDesc } = req.body;

    try {
        let categoryData = { cName, cDesc };

        if (req.role === 'businessowner') {
            categoryData.businessowner = req.user._id;
        } else {
            categoryData.businessowner = req.user.businessowner;
            categoryData.employee = req.user._id;
        }

        const category = await Category.create(categoryData);

        // Send notification to employees if created by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutCategory(
                req.user._id,
                'created',
                cName,
                { categoryId: category._id, description: cDesc }
            );
        } else {
            // Send notification to business owner if created by any employee-type role
            await notifyBusinessOwnerAboutCategory(
                req.user.businessowner,
                req.user._id,
                'created',
                cName,
                { categoryId: category._id, description: cDesc, createdBy: req.role }
            );
        }

        res.json({category, success: true});
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Category — permission-based access with warehouse filtering
router.post('/getcategory', fetchuser, async (req, res) => {
    // Check permission to view categories
    // Also allow users with product permissions (they need category list for product forms)
    if (!hasPermission(req.user, 'canViewCategories') && 
        !hasPermission(req.user, 'canViewProducts') && 
        !hasPermission(req.user, 'canCreateProducts') && 
        !hasPermission(req.user, 'canEditProducts')) {
        return res.status(403).json({ error: "You do not have permission to view categories" });
    }

    try {
        let category = [];

        if (req.role === 'businessowner') {
            category = await Category.find({ businessowner: req.user._id });
        } else {
            // For all employee-type roles: get categories for their business and their warehouse
            const Employee = require('../models/Employee');
            const employee = await Employee.findById(req.user._id).populate('warehouse');
            
            const businessownerID = req.user.businessowner;
            const employeeID = req.user._id;
            let warehouseId = employee && employee.warehouse ? employee.warehouse._id : null;
            
            if (warehouseId) {
                // Include business owner categories + employee's own categories + warehouse categories
                category = await Category.find({
                    $or: [
                        { businessowner: businessownerID },
                        { employee: employeeID },
                        { warehouse: warehouseId }
                    ]
                });
            } else {
                // No warehouse assigned, show only business owner and employee's categories
                category = await Category.find({
                    $or: [
                        { businessowner: businessownerID },
                        { employee: employeeID }
                    ]
                });
            }
        }

        res.json(category);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Category — permission-based access
router.put('/updatecategory/:id', fetchuser, [
    body('cName', 'Enter Category Name').exists(),
    body('cDesc', 'Enter Category Description').exists(),
], async (req, res) => {
    // Check permission to edit categories
    if (!hasPermission(req.user, 'canEditCategory')) {
        return res.status(403).json({ error: "You do not have permission to update categories" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cName, cDesc } = req.body;

    try {
        const newCategory = { cName, cDesc };

        let category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send("Not Found");

        // Verify ownership
        if (req.role === 'businessowner') {
            if (category.businessowner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: "Access denied" });
            }
        } else {
            if (category.businessowner.toString() !== req.user.businessowner.toString()) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        category = await Category.findByIdAndUpdate(req.params.id, { $set: newCategory }, { new: true });

        // Send notification to employees if updated by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutCategory(
                req.user._id,
                'updated',
                cName,
                { categoryId: category._id, description: cDesc }
            );
        } else {
            // Send notification to business owner if updated by any employee-type role
            await notifyBusinessOwnerAboutCategory(
                req.user.businessowner,
                req.user._id,
                'updated',
                cName,
                { categoryId: category._id, description: cDesc, updatedBy: req.role }
            );
        }

        res.json({ category, success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get All Categories — permission-based access
router.post('/getcategories', fetchuser, async (req, res) => {
    // Check permission to view categories
    if (!hasPermission(req.user, 'canViewCategories')) {
        return res.status(403).json({ error: "You do not have permission to view categories" });
    }

    try {
        let categories = [];

        if (req.role === 'businessowner') {
            categories = await Category.find({ businessowner: req.user._id });
        } else {
            categories = await Category.find({ businessowner: req.user.businessowner });
        }

        res.json(categories);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Category — permission-based access
router.delete('/deletecategory/:id', fetchuser, async (req, res) => {
    // Check permission to delete categories
    if (!hasPermission(req.user, 'canDeleteCategory')) {
        return res.status(403).json({ error: "You do not have permission to delete categories" });
    }

    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send("Not Found");

        // Verify ownership
        if (req.role === 'businessowner') {
            if (category.businessowner.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: "Access denied" });
            }
        } else {
            if (category.businessowner.toString() !== req.user.businessowner.toString()) {
                return res.status(403).json({ error: "Access denied" });
            }
        }

        const categoryName = category.cName;
        const businessOwnerId = category.businessowner;

        await Category.findByIdAndDelete(req.params.id);

        // Send notification to employees if deleted by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutCategory(
                businessOwnerId,
                'deleted',
                categoryName,
                { categoryId: req.params.id }
            );
        } else {
            // Send notification to business owner if deleted by any employee-type role
            await notifyBusinessOwnerAboutCategory(
                businessOwnerId,
                req.user._id,
                'deleted',
                categoryName,
                { categoryId: req.params.id, deletedBy: req.role }
            );
        }

        res.json({ message: "Category deleted successfully", success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;

