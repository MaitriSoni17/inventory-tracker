const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Category = require('../models/Category');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { notifyEmployeesAboutCategory, notifyBusinessOwnerAboutCategory } = require('../utils/notificationHelper');
const { hasPermission } = require('../middleware/roleBasedAccess');

// Create Category — only BusinessOwner and Manager
router.post('/createcategory', fetchuser, [
    body('cName', 'Enter Category Name').exists(),
    body('cDesc', 'Enter Category Description').exists(),
], async (req, res) => {
    // Only BusinessOwner and Manager can create categories
    if (!['businessowner', 'manager'].includes(req.role)) {
        return res.status(403).json({ error: "You do not have permission to create categories" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cName, cDesc } = req.body;

    try {
        let categoryData = { cName, cDesc };

        if (req.role === 'businessowner') {
            categoryData.businessowner = req.user._id;
        } else if (req.role === 'manager') {
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
        } else if (req.role === 'manager') {
            // Send notification to business owner if created by manager
            await notifyBusinessOwnerAboutCategory(
                req.user.businessowner,
                req.user._id,
                'created',
                cName,
                { categoryId: category._id, description: cDesc, createdBy: 'manager' }
            );
        }

        res.json({category, success: true});
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Category — accessible by all authenticated users
router.post('/getcategory', fetchuser, async (req, res) => {
    try {
        let category = [];

        if (req.role === 'businessowner') {
            category = await Category.find({ businessowner: req.user._id });
        } else if (['employee', 'supervisor', 'manager'].includes(req.role)) {
            const businessownerID = req.user.businessowner;
            const employeeID = req.user._id;
            category = await Category.find({
                $or: [
                    { businessowner: businessownerID },
                    { employee: employeeID }
                ]
            });
        }

        res.json(category);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Category — only BusinessOwner and Manager can update
router.put('/updatecategory/:id', fetchuser, [
    body('cName', 'Enter Category Name').exists(),
    body('cDesc', 'Enter Category Description').exists(),
], async (req, res) => {
    // Only BusinessOwner and Manager can update categories
    if (!['businessowner', 'manager'].includes(req.role)) {
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
        } else if (req.role === 'manager') {
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
        } else if (req.role === 'manager') {
            // Send notification to business owner if updated by manager
            await notifyBusinessOwnerAboutCategory(
                req.user.businessowner,
                req.user._id,
                'updated',
                cName,
                { categoryId: category._id, description: cDesc, updatedBy: 'manager' }
            );
        }

        res.json({ category, success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get All Categories — accessible by all authenticated users (view-only for supervisor/employee)
router.post('/getcategories', fetchuser, async (req, res) => {
    try {
        let categories = [];

        if (req.role === 'businessowner') {
            categories = await Category.find({ businessowner: req.user._id });
        } else if (['manager', 'supervisor', 'employee'].includes(req.role)) {
            categories = await Category.find({ businessowner: req.user.businessowner });
        }

        res.json(categories);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Category — only BusinessOwner and Manager
router.delete('/deletecategory/:id', fetchuser, async (req, res) => {
    // Only BusinessOwner and Manager can delete categories
    if (!['businessowner', 'manager'].includes(req.role)) {
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
        } else if (req.role === 'manager') {
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
        } else if (req.role === 'manager') {
            // Send notification to business owner if deleted by manager
            await notifyBusinessOwnerAboutCategory(
                businessOwnerId,
                req.user._id,
                'deleted',
                categoryName,
                { categoryId: req.params.id, deletedBy: 'manager' }
            );
        }

        res.json({ message: "Category deleted successfully", success: true });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;

