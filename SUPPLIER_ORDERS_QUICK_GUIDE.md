# Quick Start Guide - Supplier Orders Feature

## How to Use the Supplier Orders Module

### Step 1: Navigate to Suppliers
- Click on **Suppliers** in the sidebar
- You'll see a list of all suppliers

### Step 2: View Orders for a Supplier
- Find the supplier you want to manage orders for
- Click the **green box icon** (View Orders) in the Actions column
- This will take you to the Supplier Orders page

### Step 3: Managing Orders

#### **View All Orders**
Once on the Supplier Orders page, you'll see:
- Supplier name at the top
- Statistics showing total orders and total amount
- Table with all orders for this supplier

#### **Search Orders**
- Use the search bar at the top to find orders by:
  - Product name
  - Category
  - Order ID

#### **Filter Orders**
Use the filter dropdowns to narrow down:
1. **Status**: Pending, Paid, Cancelled
2. **Product Availability**: Available, Out of Stock, Coming Soon
3. **Delivery Status**: Pending, Packed, Shipped, Delivered

Click **Reset** to clear all filters.

#### **Add New Order**
1. Click the **+ Add Order** button (top right)
2. Fill in the order details:
   - **Product Name** (required)
   - **Category** (required) - select from dropdown
   - **Amount** (required) - in rupees
   - **Units** (required) - quantity
   - **Order Date** (required) - when the order was placed
   - **Delivery Date** (required) - expected delivery
   - **Status** - payment status (optional)
   - **Product Availability** - product stock status (optional)
   - **Delivery Status** - shipping status (optional)
   - **Description** - additional notes (optional)
3. Click **Create Order**

#### **Edit an Order**
1. Find the order in the table
2. Click the **blue pencil icon** (Edit)
3. Modify any fields as needed
4. Click **Update Order**

#### **Delete an Order**
1. Find the order in the table
2. Click the **red trash icon** (Delete)
3. Confirm the deletion in the popup

### Step 4: Export Orders

#### **Export to Excel**
1. Click the **green Excel icon** (top right)
2. A .xlsx file will be downloaded with:
   - All order details in columns
   - Properly formatted dates
   - Supplier name in filename

#### **Export to PDF**
1. Click the **red PDF icon** (top right)
2. A PDF file will be downloaded with:
   - Professional report format
   - Supplier name and date generated
   - Landscape orientation for better readability
   - Summary with total orders and amount

## Order Status Reference

### Payment Status
- **Pending**: Order awaiting payment
- **Paid**: Payment has been received
- **Cancelled**: Order has been cancelled

### Product Availability
- **Available**: Product is in stock
- **Out of Stock**: Product is currently unavailable
- **Coming Soon**: Product will be available soon

### Delivery Status
- **Pending**: Order not yet shipped
- **Packed**: Order has been packed
- **Shipped**: Order is in transit
- **Delivered**: Order has been delivered

## Tips & Tricks

1. **Bulk Export**: Use filters to export specific orders only
   - Example: Filter by "Pending" status to export only pending orders

2. **Date Validation**: Delivery date must always be after the order date

3. **Search Tips**: 
   - Search is case-insensitive
   - Search by partial text works
   - Search by last 6 characters of Order ID

4. **Color Codes**:
   - Green badges = Positive status
   - Yellow badges = Intermediate status
   - Red badges = Negative status

5. **Mobile Friendly**: Scroll the table horizontally on mobile devices

## Keyboard Shortcuts (Optional)
- Press **Tab** to navigate between form fields
- Press **Enter** to submit forms
- Press **Escape** to cancel/close

## Common Scenarios

### Scenario 1: Track an Order Status
1. Go to Suppliers → View Orders for the supplier
2. Search for the product name
3. Check the "Delivery Status" column for current status
4. Edit to update status as order progresses

### Scenario 2: Bulk Export Monthly Orders
1. Go to Suppliers → View Orders
2. Filter by date range if needed
3. Click Excel icon to export
4. Use for monthly reconciliation

### Scenario 3: Find All Pending Payments
1. Go to Suppliers → View Orders
2. Filter Status = "Pending"
3. See all orders awaiting payment
4. Update status to "Paid" once payment received

### Scenario 4: Track Out of Stock Products
1. Go to Suppliers → View Orders
2. Filter Product Availability = "Out of Stock"
3. Monitor these orders separately
4. Update to "Available" when stock arrives

## Troubleshooting

### Issue: Can't see supplier orders
**Solution**: Ensure you clicked the green "View Orders" button, not the edit button

### Issue: Filters not working
**Solution**: Click "Reset" first, then reapply filters

### Issue: Export not downloading
**Solution**: 
- Check browser download settings
- Disable pop-up blockers
- Try a different browser
- Ensure you have data to export

### Issue: Can't add order
**Solution**: 
- Check all red asterisk (*) fields are filled
- Ensure delivery date is after order date
- Check browser console for specific error

### Issue: Form won't save
**Solution**:
- Verify all required fields (marked with *)
- Check that numeric fields contain numbers only
- Try refreshing the page and trying again

## Data Entry Guidelines

### Product Names
- Use consistent naming
- Include variant/model if applicable
- Examples: "Component A", "Raw Material - Type 1"

### Categories
- Select from predefined categories
- Creates better organization
- Helps with reporting

### Amounts
- Enter in full currency (₹)
- Use whole numbers or decimals
- Example: 1500.50

### Units
- Use whole numbers
- Based on your standard unit (pcs, kg, etc.)
- Example: 100, 50, 1000

### Dates
- Follow YYYY-MM-DD format
- Use date picker for accuracy
- Delivery date > Order date

### Description
- Optional but recommended
- Include special conditions
- Note any discounts or agreements

## Best Practices

1. **Always set delivery status** to track orders properly
2. **Update payment status** as soon as payment is received
3. **Add descriptions** for complex orders
4. **Use consistent product names** for better tracking
5. **Export regularly** for record keeping
6. **Review pending orders** weekly

## Support

For issues or questions:
- Check this guide first
- Review error messages in alerts
- Contact system administrator

---

**Last Updated**: December 2025
**Version**: 1.0
