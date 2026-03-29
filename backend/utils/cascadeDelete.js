/**
 * Cascade Deletion Utility
 * Handles complete deletion of Business Owner and all associated data
 */

const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const Products = require('../models/Products');
const Category = require('../models/Category');
const Orders = require('../models/Orders');
const Warehouse = require('../models/Warehouse');
const CustomerOrders = require('../models/CustomerOrders');
const SupplierOrders = require('../models/SupplierOrders');
const Notification = require('../models/Notification');
const DeletionRequest = require('../models/DeletionRequest');

const getBusinessOwnerDeletionImpact = async (businessOwnerId) => {
    const [
        employees,
        suppliers,
        products,
        categories,
        orders,
        warehouses,
        customerOrders,
        supplierOrders,
        notifications,
        deletionRequests
    ] = await Promise.all([
        Employee.countDocuments({ businessowner: businessOwnerId }),
        Supplier.countDocuments({ businessowner: businessOwnerId }),
        Products.countDocuments({ businessowner: businessOwnerId }),
        Category.countDocuments({ businessowner: businessOwnerId }),
        Orders.countDocuments({ businessowner: businessOwnerId }),
        Warehouse.countDocuments({ businessowner: businessOwnerId }),
        CustomerOrders.countDocuments({ businessowner: businessOwnerId }),
        SupplierOrders.countDocuments({ businessowner: businessOwnerId }),
        Notification.countDocuments({
            $or: [
                { recipient: businessOwnerId },
                { sender: businessOwnerId }
            ]
        }),
        DeletionRequest.countDocuments({
            $or: [
                { userId: businessOwnerId },
                { creatorId: businessOwnerId }
            ]
        })
    ]);

    const totalOrders = orders + customerOrders + supplierOrders;

    return {
        employees,
        suppliers,
        products,
        categories,
        orders,
        customerOrders,
        supplierOrders,
        totalOrders,
        warehouses,
        notifications,
        deletionRequests,
        generatedAt: new Date()
    };
};

/**
 * Cascade delete all data associated with a Business Owner
 * @param {String} businessOwnerId - The Business Owner's user ID
 * @returns {Object} - Summary of deleted items
 */
const cascadeDeleteBusinessOwner = async (businessOwnerId) => {
    try {
        const summary = {
            employees: 0,
            suppliers: 0,
            products: 0,
            categories: 0,
            orders: 0,
            warehouses: 0,
            customerOrders: 0,
            supplierOrders: 0,
            notifications: 0,
            deletionRequests: 0,
            errors: []
        };

        // 1. Delete all Employees
        try {
            const employeeResult = await Employee.deleteMany({ businessowner: businessOwnerId });
            summary.employees = employeeResult.deletedCount || 0;
        } catch (err) {
            summary.errors.push(`Error deleting employees: ${err.message}`);
            // console.error('Error deleting employees:', err);
        }

        // 2. Delete all Suppliers
        try {
            const supplierResult = await Supplier.deleteMany({ businessowner: businessOwnerId });
            summary.suppliers = supplierResult.deletedCount || 0;
        } catch (err) {
            summary.errors.push(`Error deleting suppliers: ${err.message}`);
            // console.error('Error deleting suppliers:', err);
        }

        // 3. Delete all Products
        try {
            const productResult = await Products.deleteMany({ businessowner: businessOwnerId });
            summary.products = productResult.deletedCount || 0;
        } catch (err) {
            summary.errors.push(`Error deleting products: ${err.message}`);
            // console.error('Error deleting products:', err);
        }

        // 4. Delete all Categories
        try {
            const categoryResult = await Category.deleteMany({ businessowner: businessOwnerId });
            summary.categories = categoryResult.deletedCount || 0;
        } catch (err) {
            summary.errors.push(`Error deleting categories: ${err.message}`);
            // console.error('Error deleting categories:', err);
        }

        // 5. Delete all Orders
        try {
            const orderResult = await Orders.deleteMany({ businessowner: businessOwnerId });
            summary.orders = orderResult.deletedCount || 0;
        } catch (err) {
            summary.errors.push(`Error deleting orders: ${err.message}`);
            // console.error('Error deleting orders:', err);
        }

        // 6. Delete all Warehouses
        try {
            const warehouseResult = await Warehouse.deleteMany({ businessowner: businessOwnerId });
            summary.warehouses = warehouseResult.deletedCount || 0;
        } catch (err) {
            summary.errors.push(`Error deleting warehouses: ${err.message}`);
            // console.error('Error deleting warehouses:', err);
        }

        // 7. Delete all Customer Orders
        try {
            const customerOrderResult = await CustomerOrders.deleteMany({ businessowner: businessOwnerId });
            summary.customerOrders = customerOrderResult.deletedCount || 0;
        } catch (err) {
            summary.errors.push(`Error deleting customer orders: ${err.message}`);
            // console.error('Error deleting customer orders:', err);
        }

        // 8. Delete all Supplier Orders
        try {
            const supplierOrderResult = await SupplierOrders.deleteMany({ businessowner: businessOwnerId });
            summary.supplierOrders = supplierOrderResult.deletedCount || 0;
        } catch (err) {
            summary.errors.push(`Error deleting supplier orders: ${err.message}`);
            // console.error('Error deleting supplier orders:', err);
        }

        // 9. Delete all Notifications related to this Business Owner
        try {
            const notificationResult = await Notification.deleteMany({
                $or: [
                    { recipient: businessOwnerId },
                    { sender: businessOwnerId }
                ]
            });
            summary.notifications = notificationResult.deletedCount || 0;
        } catch (err) {
            summary.errors.push(`Error deleting notifications: ${err.message}`);
            // console.error('Error deleting notifications:', err);
        }

        // 10. Delete all Deletion Requests for this Business Owner
        try {
            const deletionResult = await DeletionRequest.deleteMany({
                $or: [
                    { userId: businessOwnerId },
                    { creatorId: businessOwnerId }
                ]
            });
            summary.deletionRequests = deletionResult.deletedCount || 0;
        } catch (err) {
            summary.errors.push(`Error deleting deletion requests: ${err.message}`);
            // console.error('Error deleting deletion requests:', err);
        }

        return summary;
    } catch (err) {
        // console.error('Fatal error in cascade deletion:', err);
        throw new Error(`Cascade deletion failed: ${err.message}`);
    }
};

module.exports = { cascadeDeleteBusinessOwner, getBusinessOwnerDeletionImpact };
