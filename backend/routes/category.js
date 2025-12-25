const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Category = require('../models/Category');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { notifyEmployeesAboutCategory, notifyBusinessOwnerAboutCategory } = require('../utils/notificationHelper');

// Create Category — accessible by BusinessOwner or Employee
router.post('/createcategory', fetchuser, [
    body('cName', 'Enter Category Name').exists(),
    body('cDesc', 'Enter Category Description').exists(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cName, cDesc } = req.body;

    try {
        let categoryData = { cName, cDesc };

        if (req.role === 'businessowner') {
            categoryData.businessowner = req.user._id;
        } else if (req.role === 'employee') {
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
        } else if (req.role === 'employee') {
            // Send notification to business owner if created by employee
            
            await notifyBusinessOwnerAboutCategory(
                req.user.businessowner,
                req.user._id,
                'created',
                cName,
                { categoryId: category._id, description: cDesc }
            );
        }

        res.json({category, success: true});
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Category — accessible by BusinessOwner or Employee
router.post('/getcategory', fetchuser, async (req, res) => {
    try {
        let category = [];

        if (req.role === 'businessowner') {
            category = await Category.find({ businessowner: req.user._id });
        } else if (req.role === 'employee') {
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

// Update Category — only BusinessOwner can update
router.put('/updatecategory/:id', fetchuser, [
    body('cName', 'Enter Category Name').exists(),
    body('cDesc', 'Enter Category Description').exists(),
], async (req, res) => {
    // if (req.role !== 'businessowner' || req.role !== 'employee') {
    //     return res.status(403).send("Only BusinessOwner or Employee can update category");
    // }
    if (!['businessowner', 'employee'].includes(req.role)) {
        return res.status(403).send("Only BusinessOwner or Employee can update cateogry");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cName, cDesc } = req.body;

    try {
        const newCategory = { cName, cDesc };

        let category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send("Not Found");

        // if (category.businessowner.toString() !== req.user._id.toString() || (req.role === 'employee' && category.employee.toString() !== req.user._id.toString())) {
        //     return res.status(401).send("Not Allowed");
        // }

        category = await Category.findByIdAndUpdate(req.params.id, { $set: newCategory }, { new: true });

        // Send notification to employees if updated by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutCategory(
                req.user._id,
                'updated',
                cName,
                { categoryId: category._id, description: cDesc }
            );
        } else if (req.role === 'employee') {
            // Send notification to business owner if updated by employee
            await notifyBusinessOwnerAboutCategory(
                req.user.businessowner,
                req.user._id,
                'updated',
                cName,
                { categoryId: category._id, description: cDesc }
            );
        }

        res.json({ category });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Get All Categories — accessible by BusinessOwner or Employee
router.post('/getcategories', fetchuser, async (req, res) => {
    try {
        let categories = [];

        if (req.role === 'businessowner') {
            categories = await Category.find({ businessowner: req.user._id });
        } else if (req.role === 'employee') {
            const businessownerID = req.user.businessowner;
            const employeeID = req.user._id;
            categories = await Category.find({
                $or: [
                    { businessowner: businessownerID },
                    { employee: employeeID }
                ]
            });
        }

        res.json(categories);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Category — only BusinessOwner can delete
router.delete('/deletecategory/:id', fetchuser, async (req, res) => {
    // if (req.role !== 'businessowner' || req.role !== 'employee') {
    //     return res.status(403).send("Only BusinessOwner or Employee can delete cateogry");
    // }
    if (!['businessowner', 'employee'].includes(req.role)) {
        return res.status(403).send("Only BusinessOwner or Employee can delete category");
    }

    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send("Not Found");

        // if (category.businessowner.toString() !== req.user._id.toString() || (req.role === 'employee' && category.employee.toString() !== req.user._id.toString())) {
        //     return res.status(401).send("Not Allowed");
        // }

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
        } else if (req.role === 'employee') {
            // Send notification to business owner if deleted by employee
            await notifyBusinessOwnerAboutCategory(
                businessOwnerId,
                req.user._id,
                'deleted',
                categoryName,
                { categoryId: req.params.id }
            );
        }

        res.json({ message: "Category deleted successfully" });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;

