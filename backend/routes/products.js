const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Product = require('../models/Products');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Create Product — accessible by BusinessOwner or Employee
router.post('/createproduct', fetchuser, [
    body('name', 'Enter Product Name').exists(),
    body('category', 'Enter Category').exists(),
    body('price', 'Enter Price').exists().isNumeric(),
    body('totalProducts', 'Enter Total Products').exists().isNumeric(),
    body('mDate', 'Enter Manufacturing Date').exists().isDate(),
    body('eDate', 'Enter Expiring Date').exists().isDate(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc, image } = req.body;

    try {
        let productData = {
            name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc, image
        };

        console.log(req.user, req.role);

        if (req.role === 'businessowner') {
            productData.businessowner = req.user._id;
        } else if (req.role === 'employee') {
            productData.businessowner = req.user.businessowner;
            productData.employee = req.user._id;
        }

        const product = await Product.create(productData);
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Products — accessible by BusinessOwner or Employee
router.post('/getproduct', fetchuser, async (req, res) => {
    try {
        let products = [];

        if (req.role === 'businessowner') {
            products = await Product.find({ businessowner: req.user._id });
        }
        else if (req.role === 'employee') {
            const businessownerID = req.user.businessowner;
            const employeeID = req.user._id;

            products = await Product.find({
                $or: [
                    { businessowner: businessownerID },
                    { employee: employeeID }
                ]
            });
        }

        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Product — only BusinessOwner can update
router.put('/updateproduct/:id', fetchuser, [
    body('name', 'Enter Product Name').exists(),
    body('category', 'Enter Category').exists(),
    body('price', 'Enter Price').exists().isNumeric(),
    body('totalProducts', 'Enter Total Products').exists().isNumeric(),
    body('mDate', 'Enter Manufacturing Date').exists().isDate(),
    body('eDate', 'Enter Expiring Date').exists().isDate(),
], async (req, res) => {
    // if (req.role !== 'businessowner' || req.role !== 'employee') {
    //     return res.status(403).send("Only BusinessOwner or Employee can update products");
    // }

    if (!['businessowner', 'employee'].includes(req.role)) {
        return res.status(403).send("Only BusinessOwner or Employee can update products");
    }


    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc, image } = req.body;

    try {
        const newProduct = { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc, image };

        let product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send("Not Found");

        // if (product.businessowner.toString() !== req.user._id.toString() || (product.employee.toString() !== req.user._id.toString())) {
        //     return res.status(401).send("Not Allowed");
        // }

        product = await Product.findByIdAndUpdate(req.params.id, { $set: newProduct }, { new: true });
        res.json({ product });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Product — only BusinessOwner can delete
router.delete('/deleteproduct/:id', fetchuser, async (req, res) => {
    // if (req.role !== 'businessowner') {
    //     return res.status(403).send("Only BusinessOwner can delete products");
    // }

    if (!['businessowner', 'employee'].includes(req.role)) {
        return res.status(403).send("Only BusinessOwner or Employee can delete category");
    }

    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send("Not Found");

        // if (product.businessowner.toString() !== req.user._id.toString()) {
        //     return res.status(401).send("Not Allowed");
        // }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;