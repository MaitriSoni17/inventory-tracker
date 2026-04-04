const express = require('express');
const fetchuser = require('../middleware/fetchuser');
const Product = require('../models/Products');
const Employee = require('../models/Employee');
const RolePermissions = require('../models/RolePermissions');
const Category = require('../models/Category');
const Warehouse = require('../models/Warehouse');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
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
const { logAuditEvent } = require('../utils/auditLogger');
const { recordStockMovement } = require('../utils/stockMovementHelper');

const parseDateInput = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeImportRow = (row = {}) => {
    const rawWarehouse = row.warehouse;
    let normalizedWarehouse = [];

    if (Array.isArray(rawWarehouse)) {
        normalizedWarehouse = rawWarehouse.map((v) => String(v || '').trim()).filter(Boolean);
    } else if (typeof rawWarehouse === 'string' && rawWarehouse.trim()) {
        normalizedWarehouse = rawWarehouse
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
    }

    return {
        name: String(row.name || '').trim(),
        category: String(row.category || '').trim(),
        price: Number(row.price),
        totalProducts: Number(row.totalProducts),
        warehouse: [...new Set(normalizedWarehouse)],
        brand: row.brand ? String(row.brand).trim() : '',
        mDate: parseDateInput(row.mDate),
        eDate: parseDateInput(row.eDate),
        desc: row.desc ? String(row.desc).trim() : ''
    };
};

const validateImportRow = (row) => {
    const errors = [];

    if (!row.name) errors.push('name is required');
    if (!row.category) errors.push('category is required');
    if (!Number.isFinite(row.price) || row.price < 0) errors.push('price must be a non-negative number');
    if (!Number.isInteger(row.totalProducts) || row.totalProducts < 0) errors.push('totalProducts must be a non-negative integer');
    if (!row.mDate) errors.push('mDate must be a valid date');
    if (!row.eDate) errors.push('eDate must be a valid date');
    if (row.mDate && row.eDate && row.mDate > row.eDate) errors.push('mDate must be less than or equal to eDate');

    return errors;
};

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

const isAllowedCategoryForEmployee = (allowedCategories, categoryId) => {
    if (!Array.isArray(allowedCategories)) return true;
    const normalizedCategory = String(categoryId || '').trim();
    if (!normalizedCategory) return false;
    return allowedCategories.map((id) => String(id)).includes(normalizedCategory);
};

const getEffectiveAllowedProductCategories = async (employee) => {
    if (!employee) return undefined;

    if (employee.hasCustomCategoryAccess === true) {
        if (!Array.isArray(employee.allowedProductCategories)) return undefined;
        return [...new Set(employee.allowedProductCategories.map((id) => String(id || '').trim()).filter(Boolean))];
    }

    const rolePermissions = await RolePermissions.findOne({ businessowner: employee.businessowner });
    if (!rolePermissions) {
        if (!Array.isArray(employee.allowedProductCategories)) return undefined;
        return [...new Set(employee.allowedProductCategories.map((id) => String(id || '').trim()).filter(Boolean))];
    }

    let rolePerms;
    if (['manager', 'supervisor', 'employee'].includes(employee.role)) {
        rolePerms = rolePermissions[employee.role];
    } else if (rolePermissions.customRoles && rolePermissions.customRoles.has(employee.role)) {
        rolePerms = rolePermissions.customRoles.get(employee.role);
    }

    const rolePermObj = rolePerms && rolePerms.toObject ? rolePerms.toObject() : rolePerms;
    if (!Array.isArray(rolePermObj?.allowedProductCategories)) return undefined;
    return [...new Set(rolePermObj.allowedProductCategories.map((id) => String(id || '').trim()).filter(Boolean))];
};

// Product import preview with row-level validation
router.post('/import/preview', fetchuser, async (req, res) => {
    if (!hasPermission(req.user, 'canCreateProducts')) {
        return res.status(403).json({ error: 'You do not have permission to import products' });
    }

    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (rows.length === 0) {
        return res.status(400).json({ error: 'rows must be a non-empty array' });
    }

    const allowedCategories = req.role === 'businessowner'
        ? undefined
        : await getEffectiveAllowedProductCategories(req.user);

    const validRows = [];
    const invalidRows = [];
    const uniqueness = new Set();

    rows.forEach((rawRow, index) => {
        const row = normalizeImportRow(rawRow);
        const errors = validateImportRow(row);

        if (req.role !== 'businessowner' && !isAllowedCategoryForEmployee(allowedCategories, row.category)) {
            errors.push('category is not allowed for your role');
        }

        const uniqueKey = `${row.name.toLowerCase()}::${row.category}::${row.brand.toLowerCase()}`;
        if (uniqueness.has(uniqueKey)) {
            errors.push('duplicate row in import payload');
        }
        uniqueness.add(uniqueKey);

        if (errors.length > 0) {
            invalidRows.push({ rowNumber: index + 1, errors, row: rawRow });
        } else {
            validRows.push({ rowNumber: index + 1, row });
        }
    });

    await logAuditEvent({
        req,
        businessowner: req.role === 'businessowner' ? req.user._id : req.user.businessowner,
        action: 'products.import.preview',
        entityType: 'product',
        summary: `Previewed ${rows.length} product import rows`,
        metadata: {
            totalRows: rows.length,
            validRows: validRows.length,
            invalidRows: invalidRows.length
        }
    });

    return res.json({
        success: true,
        summary: {
            totalRows: rows.length,
            validRows: validRows.length,
            invalidRows: invalidRows.length
        },
        validRows,
        invalidRows
    });
});

// Product import commit supports create-only and upsert behavior
router.post('/import/commit', fetchuser, async (req, res) => {
    if (!hasPermission(req.user, 'canCreateProducts')) {
        return res.status(403).json({ error: 'You do not have permission to import products' });
    }

    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const mode = req.body.mode === 'create-only' ? 'create-only' : 'upsert';
    if (rows.length === 0) {
        return res.status(400).json({ error: 'rows must be a non-empty array' });
    }

    const allowedCategories = req.role === 'businessowner'
        ? undefined
        : await getEffectiveAllowedProductCategories(req.user);

    const businessOwnerId = req.role === 'businessowner' ? req.user._id : req.user.businessowner;
    const actorId = req.user._id;
    const actorRole = req.role;

    const results = [];

    for (let i = 0; i < rows.length; i++) {
        const rawRow = rows[i];
        const row = normalizeImportRow(rawRow);
        const errors = validateImportRow(row);

        if (req.role !== 'businessowner' && !isAllowedCategoryForEmployee(allowedCategories, row.category)) {
            errors.push('category is not allowed for your role');
        }

        if (errors.length > 0) {
            results.push({ rowNumber: i + 1, success: false, errors });
            continue;
        }

        const normalizedBrand = row.brand || '';
        const existingQuery = {
            businessowner: businessOwnerId,
            name: row.name,
            category: row.category
        };

        if (normalizedBrand) {
            existingQuery.brand = normalizedBrand;
        } else {
            existingQuery.$or = [
                { brand: '' },
                { brand: { $exists: false } },
                { brand: null }
            ];
        }

        const existing = await Product.findOne(existingQuery);

        if (existing && mode === 'create-only') {
            results.push({ rowNumber: i + 1, success: false, errors: ['product already exists'] });
            continue;
        }

        if (!existing) {
            const createdProduct = await Product.create({
                ...row,
                businessowner: businessOwnerId,
                employee: req.role === 'businessowner' ? undefined : req.user._id
            });

            if (createdProduct.totalProducts > 0) {
                await recordStockMovement({
                    businessowner: businessOwnerId,
                    product: createdProduct._id,
                    quantityChange: createdProduct.totalProducts,
                    previousStock: 0,
                    newStock: createdProduct.totalProducts,
                    source: 'bulk_import_create',
                    reason: 'Initial stock through bulk import',
                    actorId,
                    actorRole,
                    direction: 'IN',
                    metadata: { rowNumber: i + 1 }
                });
            }

            results.push({ rowNumber: i + 1, success: true, action: 'created', productId: createdProduct._id });
            continue;
        }

        const previousStock = existing.totalProducts;
        existing.name = row.name;
        existing.category = row.category;
        existing.price = row.price;
        existing.totalProducts = row.totalProducts;
        existing.warehouse = row.warehouse;
        existing.brand = row.brand;
        existing.mDate = row.mDate;
        existing.eDate = row.eDate;
        existing.desc = row.desc;
        await existing.save();

        const delta = row.totalProducts - previousStock;
        if (delta !== 0) {
            await recordStockMovement({
                businessowner: businessOwnerId,
                product: existing._id,
                quantityChange: delta,
                previousStock,
                newStock: existing.totalProducts,
                source: 'bulk_import_update',
                reason: 'Stock reconciled through bulk import',
                actorId,
                actorRole,
                direction: 'ADJUSTMENT',
                metadata: { rowNumber: i + 1 }
            });
        }

        results.push({ rowNumber: i + 1, success: true, action: 'updated', productId: existing._id });
    }

    const succeeded = results.filter((item) => item.success).length;
    const failed = results.length - succeeded;

    await logAuditEvent({
        req,
        businessowner: businessOwnerId,
        action: 'products.import.commit',
        entityType: 'product',
        summary: `Committed import rows: ${succeeded} success, ${failed} failed`,
        metadata: {
            totalRows: rows.length,
            succeeded,
            failed,
            mode
        }
    });

    return res.json({
        success: true,
        summary: { totalRows: rows.length, succeeded, failed, mode },
        results
    });
});

// Read stock movement ledger
router.post('/stock-movements', fetchuser, async (req, res) => {
    if (!hasPermission(req.user, 'canViewProducts')) {
        return res.status(403).json({ error: 'You do not have permission to view stock movement ledger' });
    }

    const StockMovement = require('../models/StockMovement');
    const page = Math.max(parseInt(req.body.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.body.limit, 10) || 20, 1), 100);

    const businessOwnerId = req.role === 'businessowner' ? req.user._id : req.user.businessowner;
    const filter = { businessowner: businessOwnerId };

    if (req.body.productId && mongoose.Types.ObjectId.isValid(req.body.productId)) {
        filter.product = req.body.productId;
    }

    const [data, total] = await Promise.all([
        StockMovement.find(filter)
            .populate('product', 'name category')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        StockMovement.countDocuments(filter)
    ]);

    return res.json({
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

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
        const allowedCategories = req.role === 'businessowner'
            ? undefined
            : await getEffectiveAllowedProductCategories(req.user);

        if (req.role !== 'businessowner' && !isAllowedCategoryForEmployee(allowedCategories, category)) {
            return res.status(403).json({ error: 'You do not have access to this product category' });
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

        let productData = {
            name, category, price, totalProducts, warehouse: normalizedWarehouse, brand, mDate, eDate, desc
        };

        if (req.files && req.files.length > 0) {
            productData.images = req.files.map(f => f.filename);
            productData.image = req.files[0].filename;
        }

        if (req.role === 'businessowner') {
            productData.businessowner = req.user._id;
        } else {
            productData.businessowner = req.user.businessowner;
            productData.employee = req.user._id;
        }

        const product = await Product.create(productData);

        if (Number(product.totalProducts) > 0) {
            await recordStockMovement({
                businessowner: product.businessowner,
                product: product._id,
                quantityChange: Number(product.totalProducts),
                previousStock: 0,
                newStock: Number(product.totalProducts),
                source: 'product_create',
                reason: 'Initial stock at product creation',
                actorId: req.user._id,
                actorRole: req.role,
                direction: 'IN',
                metadata: { productName: name }
            });
        }

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
        } else {
            // Any other employee-type role (custom roles)
            try {
                await notifyBusinessOwnerAboutProduct(
                    req.user.businessowner,
                    req.user._id,
                    'created',
                    name,
                    { productId: product._id, category, price }
                );
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
        }

        await logAuditEvent({
            req,
            businessowner: businessOwnerId,
            action: 'product.create',
            entityType: 'product',
            entityId: product._id,
            summary: `Created product ${name}`,
            metadata: {
                category,
                price,
                totalProducts: product.totalProducts
            }
        });

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
        else {
            // All employee-type roles (including custom roles) with canViewProducts see all products in their business
            // The permission check above already ensures they have access
            try {
                const emp = await Employee.findById(req.user._id).populate('warehouse');
                
                // Always scope by business owner for data isolation
                const businessOwnerId = req.businessowner || (emp && emp.businessowner);
                
                if (businessOwnerId) {
                    const query = { businessowner: businessOwnerId };
                    const allowedCategories = await getEffectiveAllowedProductCategories(req.user);
                    if (Array.isArray(allowedCategories)) {
                        query.category = { $in: allowedCategories };
                    }
                    products = await Product.find(query);
                } else {
                    products = [];
                }
            } catch (err) {
                // console.error('Employee product lookup error:', err);
                products = [];
            }
        }
        // Enrich products with category and warehouse names
        const categoryIds = [...new Set(products.map(p => p.category).filter(Boolean))];
        const warehouseIds = [...new Set(products.flatMap(p => Array.isArray(p.warehouse) ? p.warehouse : (p.warehouse ? [p.warehouse] : [])).filter(Boolean))];

        const [categoriesList, warehousesList] = await Promise.all([
            Category.find({ _id: { $in: categoryIds } }).select('_id cName').lean(),
            Warehouse.find({ _id: { $in: warehouseIds } }).select('_id wName').lean()
        ]);

        const catMap = {};
        categoriesList.forEach(c => { catMap[c._id.toString()] = c.cName; });
        const whMap = {};
        warehousesList.forEach(w => { whMap[w._id.toString()] = w.wName; });

        const enrichedProducts = products.map(p => {
            const pObj = p.toObject ? p.toObject() : p;
            pObj.categoryName = catMap[pObj.category] || null;
            if (Array.isArray(pObj.warehouse)) {
                pObj.warehouseNames = pObj.warehouse.map(wId => whMap[wId] || null);
            } else if (pObj.warehouse) {
                pObj.warehouseNames = [whMap[pObj.warehouse] || null];
            } else {
                pObj.warehouseNames = [];
            }
            return pObj;
        });

        res.json(enrichedProducts);
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

        const allowedCategories = req.role === 'businessowner'
            ? undefined
            : await getEffectiveAllowedProductCategories(req.user);

        if (req.role !== 'businessowner' && !isAllowedCategoryForEmployee(allowedCategories, product.category)) {
            return res.status(403).json({ error: 'You do not have access to this product category' });
        }

        if (req.role !== 'businessowner' && !isAllowedCategoryForEmployee(allowedCategories, category)) {
            return res.status(403).json({ error: 'You do not have access to this product category' });
        }

        // Check if user can edit this product
        // Business owners can edit any product, employees can edit their own or others' if they have canEditOthersWork
        let canEdit = false;
        if (req.role === 'businessowner') {
            canEdit = true;
        } else if (product.employee && product.employee.toString() === req.user._id.toString()) {
            canEdit = true; // Own product
        } else if (hasPermission(req.user, 'canEditOthersWork')) {
            canEdit = true; // Has permission to edit others' work
        } else if (!product.employee) {
            // Product created by business owner — allow if user has canEditProducts
            canEdit = hasPermission(req.user, 'canEditProducts');
        }
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

        const previousStock = Number(product.totalProducts || 0);
        product = await Product.findByIdAndUpdate(req.params.id, { $set: newProduct }, { new: true });
        const updatedStock = Number(product.totalProducts || 0);
        const stockDelta = updatedStock - previousStock;

        if (stockDelta !== 0) {
            await recordStockMovement({
                businessowner: product.businessowner,
                product: product._id,
                quantityChange: stockDelta,
                previousStock,
                newStock: updatedStock,
                source: 'product_update',
                reason: 'Manual stock update from product edit',
                actorId: req.user._id,
                actorRole: req.role,
                direction: 'ADJUSTMENT',
                metadata: { productName: product.name }
            });
        }

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
        } else {
            // Any other employee-type role (custom roles)
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
        }

        await logAuditEvent({
            req,
            businessowner: businessOwnerId,
            action: 'product.update',
            entityType: 'product',
            entityId: product._id,
            summary: `Updated product ${product.name}`,
            metadata: {
                category: product.category,
                price: product.price,
                totalProducts: product.totalProducts,
                stockDelta
            }
        });

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

        const allowedCategories = req.role === 'businessowner'
            ? undefined
            : await getEffectiveAllowedProductCategories(req.user);

        if (req.role !== 'businessowner' && !isAllowedCategoryForEmployee(allowedCategories, product.category)) {
            return res.status(403).json({ error: 'You do not have access to this product category' });
        }

        // Check if user can delete this specific product based on hierarchy
        const canDelete = await canDeleteItem(req.user, product.employee);
        if (!canDelete) {
            return res.status(403).json({ error: "You do not have permission to delete this product" });
        }

        const productName = product.name;
        const businessOwnerId = product.businessowner;

        await Product.findByIdAndDelete(req.params.id);

        await logAuditEvent({
            req,
            businessowner: businessOwnerId,
            action: 'product.delete',
            entityType: 'product',
            entityId: req.params.id,
            summary: `Deleted product ${productName}`,
            metadata: {
                category: product.category,
                finalStock: product.totalProducts
            }
        });

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
        } else {
            // Send notification to business owner if deleted by any employee-type role
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

