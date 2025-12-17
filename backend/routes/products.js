const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Product = require('../models/Products');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { notifyEmployeesAboutProduct } = require('../utils/notificationHelper');

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Create Product — accessible by BusinessOwner or Employee
router.post('/createproduct', fetchuser, upload.array('images', 10), [
    body('name').exists().trim().notEmpty().withMessage('Enter Product Name'),
    body('category').exists().trim().notEmpty().withMessage('Enter Category'),
    body('price').exists().isNumeric().withMessage('Enter valid Price'),
    body('totalProducts').exists().isNumeric().withMessage('Enter valid Total Products'),
    body('mDate').exists().trim().notEmpty().withMessage('Enter Manufacturing Date'),
    body('eDate').exists().trim().notEmpty().withMessage('Enter Expiring Date'),
], async (req, res) => {
    console.log('=== CREATE PRODUCT DEBUG ===');
    console.log('req.body:', req.body);
    console.log('req.files:', req.files ? req.files.map(f => ({ fieldname: f.fieldname, filename: f.filename })) : 'no files');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc } = req.body;

    try {
        let productData = {
            name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc
        };

        if (req.files && req.files.length > 0) {
            productData.images = req.files.map(f => f.filename);
            productData.image = req.files[0].filename;
        }

        console.log('Creating product with data:', productData);
        console.log('User info:', req.user, 'Role:', req.role);

        if (req.role === 'businessowner') {
            productData.businessowner = req.user._id;
        } else if (req.role === 'employee') {
            productData.businessowner = req.user.businessowner;
            productData.employee = req.user._id;
        }

        const product = await Product.create(productData);

        // Send notification to employees if created by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutProduct(
                req.user._id,
                'created',
                name,
                { productId: product._id, category, price }
            );
        }

        res.json({product, success: true});
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: "Internal Server error occurred", error: err.message });
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
router.put('/updateproduct/:id', fetchuser, upload.array('images', 10), [
    body('name', 'Enter Product Name').exists().trim().notEmpty(),
    body('category', 'Enter Category').exists().trim().notEmpty(),
    body('price', 'Enter Price').exists().isNumeric(),
    body('totalProducts', 'Enter Total Products').exists().isNumeric(),
    body('mDate', 'Enter Manufacturing Date').exists().trim().notEmpty(),
    body('eDate', 'Enter Expiring Date').exists().trim().notEmpty(),
], async (req, res) => {
    if (!['businessowner', 'employee'].includes(req.role)) {
        return res.status(403).send("Only BusinessOwner or Employee can update products");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc, image, removedImages, images } = req.body;

    try {
        let product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send("Not Found");

        console.log('=== UPDATE PRODUCT DEBUG ===');
        console.log('Product ID:', req.params.id);
        console.log('Request body images field:', images);
        console.log('Request body removedImages field:', removedImages);
        console.log('Request body existingImages[]:', req.body['existingImages[]']);
        console.log('Request files count:', req.files ? req.files.length : 0);
        console.log('Current product images in DB:', product.images);

        // Delete removed image files from the uploads directory
        if (removedImages && removedImages.length > 0) {
            const removedImagesList = Array.isArray(removedImages) ? removedImages : [removedImages];
            removedImagesList.forEach(imageName => {
                const imagePath = path.join(__dirname, '../uploads', imageName);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                    console.log('Deleted image from disk:', imageName);
                }
            });
        }

        // Handle new images uploaded and existing images
        let updatedImages = [];
        let newImageFiles = [];
        
        // Get new uploaded files
        if (req.files && req.files.length > 0) {
            newImageFiles = req.files.map(f => f.filename);
            console.log('New uploaded files:', newImageFiles);
        }

        // Get existing images from either FormData or JSON body
        let existingImages = [];
        
        // Check FormData format (existingImages[])
        if (req.body['existingImages[]']) {
            existingImages = Array.isArray(req.body['existingImages[]']) 
                ? req.body['existingImages[]'] 
                : [req.body['existingImages[]']];
            console.log('Using existing images from FormData:', existingImages);
        } 
        // Check JSON format (images array)
        else if (images && Array.isArray(images)) {
            existingImages = images;
            console.log('Using existing images from JSON body:', existingImages);
        }
        // Fallback to product's existing images if nothing provided
        else if (product.images && product.images.length > 0) {
            existingImages = product.images;
            console.log('Using fallback - product existing images:', existingImages);
        }

        // Combine existing and new images
        updatedImages = [...existingImages, ...newImageFiles];
        console.log('Final combined images array:', updatedImages);

        const newProduct = { 
            name, 
            category, 
            price, 
            totalProducts, 
            warehouse, 
            brand, 
            mDate, 
            eDate, 
            desc, 
            image: image || (updatedImages.length > 0 ? updatedImages[0] : ''),
            images: updatedImages
        };

        console.log('Updating product with:', { image: newProduct.image, images: newProduct.images });

        product = await Product.findByIdAndUpdate(req.params.id, { $set: newProduct }, { new: true });
        console.log('Product updated in DB. New images in DB:', product.images);

        // Send notification to employees if updated by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutProduct(
                req.user._id,
                'updated',
                name,
                { productId: product._id, category, price }
            );
        }

        res.json({ product, success: true });
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

        const productName = product.name;
        const businessOwnerId = product.businessowner;

        await Product.findByIdAndDelete(req.params.id);

        // Send notification to employees if deleted by business owner
        if (req.role === 'businessowner') {
            await notifyEmployeesAboutProduct(
                businessOwnerId,
                'deleted',
                productName,
                { productId: req.params.id }
            );
        }

        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;