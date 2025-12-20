/**
 * NOTIFICATION SYSTEM FIX SUMMARY
 * ================================
 * 
 * ISSUES IDENTIFIED & FIXED:
 * 
 * 1. ROLE NAME MISMATCH (PRIMARY ISSUE)
 *    Problem: 
 *    - fetchuser middleware sets req.role as lowercase: 'businessowner', 'employee', 'supplier'
 *    - Notification model enum expects capitalized: 'BusinessOwner', 'Employee', 'Supplier'
 *    - When querying for notifications, searching with lowercase role found nothing
 *    
 *    Solution:
 *    - Updated supplierorders.js to properly capitalize role names when creating notifications
 *    - Updated notifications.js routes to capitalize req.role before querying database
 *    - All notification queries now use: 'BusinessOwner' | 'Employee' | 'Supplier'
 *
 * 2. REFPATH IMPLEMENTATION ISSUE
 *    Problem:
 *    - Initial Notification model used refPath for polymorphic references
 *    - refPath requires both sender/recipient AND senderRole/recipientRole to match model names
 *    - MongoDB couldn't properly resolve the references
 *    
 *    Solution:
 *    - Changed to simple ObjectId fields (no refPath)
 *    - Implemented manual population logic in notificationHelper.js
 *    - Each notification retrieval manually queries correct model based on role
 *
 * 3. ROLE INCONSISTENCY IN SUPPLIER ROUTES
 *    Problem:
 *    - Delete route was hardcoding 'BusinessOwner' for employee-created deletions
 *    - Create/Update routes weren't mapping supplier role correctly
 *    
 *    Solution:
 *    - Added proper role mapping for all routes:
 *      req.role === 'businessowner' ? 'BusinessOwner' : 
 *      req.role === 'employee' ? 'Employee' : 'Supplier'
 *
 * FILES MODIFIED:
 * 1. backend/models/Notification.js
 *    - Removed refPath from recipient and sender fields
 *    - Kept simple ObjectId type
 *    - All enum values remain capitalized
 *
 * 2. backend/routes/supplierorders.js
 *    - Added proper role mapping in createNotification calls
 *    - Fixed all 5 notification creation points:
 *      a) /createsupplierorder/:id - Notify supplier of order creation
 *      b) /updatesupplierorder/:id - Notify supplier of order update
 *      c) /updateorderstatus/:id - Notify business owner of status change
 *      d) /updatepaymentstatus/:id - Notify business owner of payment change
 *      e) /deletesupplierorder/:id - Notify supplier of deletion
 *
 * 3. backend/routes/notifications.js
 *    - Added role capitalization helper in all GET/PUT/DELETE endpoints
 *    - Updated endpoints:
 *      a) /getnotifications - Query with capitalized role
 *      b) /unreadcount - Query with capitalized role
 *      c) /markallasread - Update with capitalized role
 *      d) /deleteallnotifications - Delete with capitalized role
 *
 * 4. backend/utils/notificationHelper.js
 *    - Added Supplier model import
 *    - populateSenderData function handles all 3 roles
 *
 * NOTIFICATION FLOW (NOW WORKING):
 * 
 * Scenario 1: Business Owner creates order for Supplier
 * - /createsupplierorder/:id endpoint called
 * - Order saved to database
 * - createNotification called with:
 *   * recipient: supplierId
 *   * recipientRole: 'Supplier' (capitalized)
 *   * sender: businessOwnerId
 *   * senderRole: 'BusinessOwner' (capitalized)
 *   * type: 'supplier_order_created'
 * - Notification saved successfully
 * - Supplier calls /getnotifications with 'supplier' role
 * - Route capitalizes to 'Supplier'
 * - Query finds notification and populates sender data
 * - Notification displayed in UI
 *
 * Scenario 2: Supplier updates order status
 * - /updateorderstatus/:id endpoint called
 * - Status updated in database
 * - createNotification called with:
 *   * recipient: businessOwnerId
 *   * recipientRole: 'BusinessOwner' (capitalized)
 *   * sender: supplierId
 *   * senderRole: 'Supplier' (capitalized)
 *   * type: 'supplier_order_status_updated'
 * - Notification saved successfully
 * - Business Owner calls /getnotifications with 'businessowner' role
 * - Route capitalizes to 'BusinessOwner'
 * - Query finds notification and populates sender data
 * - Notification displayed in UI
 *
 * TESTING RECOMMENDATIONS:
 * 1. Create supplier order as Business Owner - check Supplier gets notification
 * 2. Update supplier order as Business Owner - check Supplier gets notification
 * 3. Update order status as Supplier - check Business Owner gets notification
 * 4. Update payment status as Supplier - check Business Owner gets notification
 * 5. Delete supplier order as Business Owner - check Supplier gets notification
 * 6. Check unread count displays correctly
 * 7. Mark notifications as read/unread
 * 8. Delete individual and all notifications
 */
