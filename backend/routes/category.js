const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Category = require('../models/Category');
const { body, validationResult } = require('express-validator');
const router = express.Router();

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
        res.json(category);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Category — accessible by BusinessOwner or Employee
router.get('/getcategory', fetchuser, async (req, res) => {
    try {
        let category = [];

        if (req.role === 'businessowner') {
            category = await Category.find({ businessowner: req.user._id });
        } else if (req.role === 'employee') {
            category = await Category.find({ employee: req.user._id }).populate('businessowner', 'fname lname email phone address');
        }

        res.json(category);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Category — only BusinessOwner can update
router.put('/updatecategory/:id', fetchuser, [
    body('cName', 'Enter Category Name').exists(),
    body('cDesc', 'Enter Category Description').exists(),
], async (req, res) => {
    if (req.role !== 'businessowner' || req.role !== 'employee') {
        return res.status(403).send("Only BusinessOwner or Employee can update category");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cName, cDesc } = req.body;

    try {
        const newCategory = { cName, cDesc };

        let category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send("Not Found");

        if (category.businessowner.toString() !== req.user._id.toString() || (req.role === 'employee' && category.employee.toString() !== req.user._id.toString())) {
            return res.status(401).send("Not Allowed");
        }

        category = await Category.findByIdAndUpdate(req.params.id, { $set: newCategory }, { new: true });
        res.json({ category });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Category — only BusinessOwner can delete
router.delete('/deletecategory/:id', fetchuser, async (req, res) => {
    if (req.role !== 'businessowner' || req.role !== 'employee') {
        return res.status(403).send("Only BusinessOwner or Employee can delete cateogry");
    }

    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send("Not Found");

        if (category.businessowner.toString() !== req.user._id.toString() || (req.role === 'employee' && category.employee.toString() !== req.user._id.toString())) {
            return res.status(401).send("Not Allowed");
        }

        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: "Customer Order deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;