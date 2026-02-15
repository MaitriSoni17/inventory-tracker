const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Product = require('../models/Products');
const Employee = require('../models/Employee');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const {
  notifyEmployeesAboutProduct,
  notifyBusinessOwnerAboutProduct,
  notifyBusinessOwnerOwnProductChanges,
  notifySubordinatesAboutProduct,
  notifyReportingManager,
  checkAndNotifyLowStock
} = require('../utils/notificationHelper');
const { 
  hasPermission, 
  canAccessUserWork,
  canEditItem,
  canDeleteItem,
  getSubordinates,
  getDataFilter
} = require('../middleware/roleBasedAccess');
const { fulfillPendingOrders } = require('../utils/pendingOrderHelper');

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

// Create Product — accessible by users with canCreateProducts permission
router.post('/createproduct', fetchuser, upload.array('images', 10), [
    body('name').exists().trim().notEmpty().withMessage('Enter Product Name'),
    body('category').exists().trim().notEmpty().withMessage('Enter Category'),
    body('price').exists().isNumeric().withMessage('Enter valid Price'),
    body('totalProducts').exists().isNumeric().withMessage('Enter valid Total Products'),
    body('mDate').exists().trim().notEmpty().withMessage('Enter Manufacturing Date'),
    body('eDate').exists().trim().notEmpty().withMessage('Enter Expiring Date'),
], async (req, res) => {
    // Check permission to create products
    if (!hasPermission(req.user, 'canCreateProducts')) {
        return res.status(403).json({ error: "You do not have permission to create products" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc } = req.body;

    try {
        // Normalize warehouse value - handle string, JSON-encoded array, or array
        let normalizedWarehouse = [];
        if (warehouse) {
            if (Array.isArray(warehouse)) {
                normalizedWarehouse = warehouse.flat().map(w => {
                    try { const parsed = JSON.parse(w); return Array.isArray(parsed) ? parsed : [parsed]; } catch { return [w]; }
                }).flat();
            } else if (typeof warehouse === 'string') {
                try {
                    const parsed = JSON.parse(warehouse);
                    normalizedWarehouse = Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                    normalizedWarehouse = [warehouse];
                }
            }
        }

        let productData = {
            name, category, price, totalProducts, warehouse: normalizedWarehouse, brand, mDate, eDate, desc
        };

        if (req.files && req.files.length > 0) {
            productData.images = req.files.map(f => f.filename);
            productData.image = req.files[0].filename;
        }

        if (req.role === 'businessowner') {
            productData.businessowner = req.user._id;
        } else if (req.role === 'employee') {
            productData.businessowner = req.user.businessowner;
            productData.employee = req.user._id;
        }

        const product = await Product.create(productData);

        // Check for low stock alert
        const businessOwnerId = req.role === 'businessowner' ? req.user._id : req.user.businessowner;
        try {
            await checkAndNotifyLowStock(product, businessOwnerId);
        } catch (e) {}

        // Auto-fulfill pending orders if this product was needed
        try {
            await fulfillPendingOrders(product._id, businessOwnerId);
        } catch (e) {}

        // Send notification to employees if created by business owner
        if (req.role === 'businessowner') {
            try {
                await notifyEmployeesAboutProduct(
                    req.user._id,
                    'created',
                    name,
                    { productId: product._id, category, price }
                );
                // Also notify the business owner about their own product creation
                await notifyBusinessOwnerOwnProductChanges(
                    req.user._id,
                    'created',
                    name,
                    { productId: product._id, category, price }
                );
            } catch (notifError) {
            }
        } else if (req.role === 'employee') {
            // Send notification to business owner if created by employee
            try {
                await notifyBusinessOwnerAboutProduct(
                    req.user.businessowner,
                    req.user._id,
                    'created',
                    name,
                    { productId: product._id, category, price }
                );
                // Notify reporting manager if exists
                if (req.user.reportingTo) {
                  await notifyReportingManager(
                    req.user._id,
                    'product_created',
                    name,
                    'product',
                    { productId: product._id, category, price }
                  );
                }
            } catch (notifError) {
            }
        } else if (['manager', 'supervisor'].includes(req.role)) {
            // If manager/supervisor creates product, notify:
            // 1. Business owner
            // 2. Their subordinates
            try {
                await notifyBusinessOwnerAboutProduct(
                    req.user.businessowner,
                    req.user._id,
                    'created',
                    name,
                    { productId: product._id, category, price, createdBy: req.user.role }
                );
                // Notify subordinates
                await notifySubordinatesAboutProduct(
                    req.user._id,
                    req.user.role,
                    'created',
                    name,
                    { productId: product._id, category, price }
                );
            } catch (notifError) {
            }
        }

        res.json({product, success: true});
    } catch (err) {
        res.status(500).json({ success: false, message: "Internal Server error occurred", error: err.message });
    }
});

// Get Products — accessible by users with canViewProducts permission
router.post('/getproduct', fetchuser, async (req, res) => {
    // Check permission to view products
    if (!hasPermission(req.user, 'canViewProducts')) {
        return res.status(403).json({ error: "You do not have permission to view products" });
    }

    try {
        let products = [];

        if (req.role === 'businessowner') {
            // Business owner sees all products in their organization
            products = await Product.find({ businessowner: req.user._id });
        }
        else if (req.role === 'manager' || req.role === 'supervisor' || req.role === 'employee') {
            // Employees/managers/supervisors with canViewProducts see all products in their business
            // The permission check above already ensures they have access
            try {
                const emp = await Employee.findById(req.user._id).populate('warehouse');
                
                // Always scope by business owner for data isolation
                const businessOwnerId = req.businessowner || (emp && emp.businessowner);
                
                if (businessOwnerId) {
                    products = await Product.find({ businessowner: businessOwnerId });
                } else {
                    products = [];
                }
            } catch (err) {
                // console.error('Employee product lookup error:', err);
                products = [];
            }
        }
        res.json(products);
    } catch (err) {
        // console.error('Error in getproduct route:', err);
        res.status(500).send("Internal Server error occurred");
    }
});

// Update Product — permission-based access
router.put('/updateproduct/:id', fetchuser, upload.array('images', 10), [
    body('name', 'Enter Product Name').exists().trim().notEmpty(),
    body('category', 'Enter Category').exists().trim().notEmpty(),
    body('price', 'Enter Price').exists().isNumeric(),
    body('totalProducts', 'Enter Total Products').exists().isNumeric(),
    body('mDate', 'Enter Manufacturing Date').exists().trim().notEmpty(),
    body('eDate', 'Enter Expiring Date').exists().trim().notEmpty(),
], async (req, res) => {
    // Check permission to edit products
    if (!hasPermission(req.user, 'canEditProducts')) {
        return res.status(403).json({ error: "You do not have permission to edit products" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, category, price, totalProducts, warehouse, brand, mDate, eDate, desc, image, removedImages, images } = req.body;

    try {
        let product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send("Not Found");

        // Check if user can edit this product based on hierarchy
        const canEdit = await canEditItem(req.user, product.employee);
        if (!canEdit) {
            return res.status(403).json({ error: "You do not have permission to edit this product" });
        }

        // Normalize warehouse value - handle string, JSON-encoded array, or array
        let normalizedWarehouse = [];
        if (warehouse) {
            if (Array.isArray(warehouse)) {
                normalizedWarehouse = warehouse.flat().map(w => {
                    try { const parsed = JSON.parse(w); return Array.isArray(parsed) ? parsed : [parsed]; } catch { return [w]; }
                }).flat();
            } else if (typeof warehouse === 'string') {
                try {
                    const parsed = JSON.parse(warehouse);
                    normalizedWarehouse = Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                    normalizedWarehouse = [warehouse];
                }
            }
        }

        // Delete removed image files from the uploads directory
        if (removedImages && removedImages.length > 0) {
            const removedImagesList = Array.isArray(removedImages) ? removedImages : [removedImages];
            removedImagesList.forEach(imageName => {
                const imagePath = path.join(__dirname, '../uploads', imageName);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });
        }

        // Handle new images uploaded and existing images
        let updatedImages = [];
        let newImageFiles = [];
        
        // Get new uploaded files
        if (req.files && req.files.length > 0) {
            newImageFiles = req.files.map(f => f.filename);
        }

        // Get existing images from either FormData or JSON body
        let existingImages = [];
        
        // Check FormData format (existingImages[])
        if (req.body['existingImages[]']) {
            existingImages = Array.isArray(req.body['existingImages[]']) 
                ? req.body['existingImages[]'] 
                : [req.body['existingImages[]']];
        } 
        // Check JSON format (images array)
        else if (images && Array.isArray(images)) {
            existingImages = images;
        }
        // Fallback to product's existing images if nothing provided
        else if (product.images && product.images.length > 0) {
            existingImages = product.images;
        }

        // Combine existing and new images
        updatedImages = [...existingImages, ...newImageFiles];

        const newProduct = { 
            name, 
            category, 
            price, 
            totalProducts, 
            warehouse: normalizedWarehouse, 
            brand, 
            mDate, 
            eDate, 
            desc, 
            image: image || (updatedImages.length > 0 ? updatedImages[0] : ''),
            images: updatedImages
        };

        product = await Product.findByIdAndUpdate(req.params.id, { $set: newProduct }, { new: true });

        // Check for low stock alert after update
        const businessOwnerId = req.role === 'businessowner' ? req.user._id : req.user.businessowner;
        try {
            await checkAndNotifyLowStock(product, businessOwnerId);
        } catch (e) {}

        // Auto-fulfill pending orders if stock increased
        let fulfilledOrders = [];
        try {
            fulfilledOrders = await fulfillPendingOrders(req.params.id, businessOwnerId);
        } catch (e) {}

        // Send notifications based on who updated it
        if (req.role === 'businessowner') {
            try {
                await notifyEmployeesAboutProduct(
                    req.user._id,
                    'updated',
                    name,
                    { productId: product._id, category, price }
                );
            } catch (notifError) {}
        } else if (req.role === 'employee') {
            // Notify business owner and reporting manager
            try {
                await notifyBusinessOwnerAboutProduct(
                    req.user.businessowner,
                    req.user._id,
                    'updated',
                    name,
                    { productId: product._id, category, price }
                );
                if (req.user.reportingTo) {
                  await notifyReportingManager(
                    req.user._id,
                    'product_updated',
                    name,
                    'product',
                    { productId: product._id, category, price }
                  );
                }
            } catch (notifError) {}
        } else if (['manager', 'supervisor'].includes(req.role)) {
            // Notify business owner and subordinates
            try {
                await notifyBusinessOwnerAboutProduct(
                    req.user.businessowner,
                    req.user._id,
                    'updated',
                    name,
                    { productId: product._id, category, price, updatedBy: req.user.role }
                );
                await notifySubordinatesAboutProduct(
                    req.user._id,
                    req.user.role,
                    'updated',
                    name,
                    { productId: product._id, category, price }
                );
            } catch (notifError) {}
        }

        res.json({ product, success: true, fulfilledOrders: fulfilledOrders.length > 0 ? fulfilledOrders : undefined });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

// Delete Product — permission-based access with hierarchy checking
router.delete('/deleteproduct/:id', fetchuser, async (req, res) => {
    // Check permission to delete products
    if (!hasPermission(req.user, 'canDeleteProducts')) {
        return res.status(403).json({ error: "You do not have permission to delete products" });
    }

    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send("Product not found");

        // Check if user can delete this specific product based on hierarchy
        const canDelete = await canDeleteItem(req.user, product.employee);
        if (!canDelete) {
            return res.status(403).json({ error: "You do not have permission to delete this product" });
        }

        const productName = product.name;
        const businessOwnerId = product.businessowner;

        await Product.findByIdAndDelete(req.params.id);

        // Send notification to employees if deleted by business owner
        if (req.role === 'businessowner') {
            try {
                await notifyEmployeesAboutProduct(
                    businessOwnerId,
                    'deleted',
                    productName,
                    { productId: req.params.id }
                );
            } catch (notifError) {
            }
        } else if (['employee', 'supervisor', 'manager'].includes(req.role)) {
            // Send notification to business owner if deleted by employee
            try {
                await notifyBusinessOwnerAboutProduct(
                    businessOwnerId,
                    req.user._id,
                    'deleted',
                    productName,
                    { productId: req.params.id }
                );
            } catch (notifError) {
            }
        }

        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});

module.exports = router;

