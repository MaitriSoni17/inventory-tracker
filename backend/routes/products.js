const express = require('express');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const fetchemployee = require('../middleware/fetchemployee');
const Product = require('../models/Products');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Create Products using: POST "/api/auth/createproduct". Login required

router.post('/createproduct', [fetchbusinessowner, fetchemployee], [
    body('name', 'Enter Product Name').exists(),
    body('category', 'Enter Category').exists(),
    body('price', 'Enter Price').exists().isNumeric(),
    body('totalProducts', 'Enter Total Products').exists().isNumeric(),
    body('mDate', 'Enter Manufacturing Date').exists().isDate(),
    body('eDate', 'Enter Expiring Date').exists().isDate(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc, image } = req.body;
    try {
        const product = await Product.create({
            businessowner: req.businessowner.id,
            name: name,
            category: category,
            price: price,  
            totalProducts: totalProducts,
            warehouse: warehouse,
            brand: brand,
            mDate: mDate,
            eDate: eDate,
            desc: desc,
            image: image
        })
        const savedProduct = await product.save();
        res.json(savedProduct);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Get Products using: GET "/api/auth/getproduct". Login required

router.get('/getproduct', [fetchbusinessowner, fetchemployee], async (req, res) => {
    const products = await Product.find({ businessowner: req.businessowner.id });
    res.json(products);
});


// Update Products using: PUT "/api/auth/updateproduct". Login required

router.put('/updateproduct/:id', [fetchbusinessowner, fetchemployee], [
    body('name', 'Enter Product Name').exists(),
    body('category', 'Enter Category').exists(),
    body('price', 'Enter Price').exists().isNumeric(),
    body('totalProducts', 'Enter Total Products').exists().isNumeric(),
    body('mDate', 'Enter Manufacturing Date').exists().isDate(),
    body('eDate', 'Enter Expiring Date').exists().isDate(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc, image } = req.body;
    try {
        const newProduct = {};
        if (name) { newProduct.name = name };
        if (category) { newProduct.category = category };
        if (price) { newProduct.price = price };
        if (totalProducts) { newProduct.totalProducts = totalProducts };
        if (warehouse) { newProduct.warehouse = warehouse };
        if (brand) { newProduct.brand = brand };
        if (mDate) { newProduct.mDate = mDate };
        if (eDate) { newProduct.eDate = eDate };
        if (desc) { newProduct.desc = desc };
        if (image) { newProduct.image = image };
        console.log(newProduct);
        let product = await Product.findById(req.params.id);
        if (!product) { return res.status(404).send("Not Found") }
        if (product.businessowner.toString() !== req.businessowner.id) {
            return res.status(401).send("Not Allowed");
        }

        product = await Product.findByIdAndUpdate(req.params.id, { $set: newProduct }, { new: true })
        console.log(product);
        res.json({ product });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Products using: DELETE "/api/auth/deleteproduct". Login required

router.delete('/deleteproduct/:id', [fetchbusinessowner, fetchemployee], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (product.businessowner.toString() !== req.businessowner.id) {
            return res.status(401).send("Not Allowed");
        }
        if (!product) { return res.status(404).send("Not Found") }
        // console.log(product);
        res.json({ product });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;