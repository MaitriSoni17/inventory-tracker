# Reports Feature Documentation

## Overview
The Reports feature allows all users to download comprehensive reports for various entities in both Excel and PDF formats. Users can filter reports by month, year, and specific items.

## Features

### Supported Report Types
1. **Employee Reports**
   - Individual employee or all employees
   - Includes: Name, Email, Phone, Role, Warehouse, Joining Date, Status

2. **Product Reports**
   - Individual product or all products
   - Includes: Product Name, Category, SKU, Quantity, Unit Price, Selling Price, Warehouse, Status, Added Date

3. **Customer Order Reports**
   - Individual order or all orders
   - Includes: Customer Name, Email, Phone, Order Date, Total Amount, Status, Payment Method, Warehouse, Products

4. **Supplier Order Reports**
   - Individual supplier order or all supplier orders
   - Includes: Supplier Name, Email, Phone, Order Date, Expected Delivery, Total Amount, Status, Payment Status, Products

### Export Formats
- **Excel (.xlsx)** - Spreadsheet format with formatted headers and auto-fitted columns
- **PDF (.pdf)** - Professional PDF documents with proper formatting

### Filtering Options
- **Month Filter** - Filter by specific month (January to December) or all months
- **Year Filter** - Filter by specific year or all years
- **Item Filter** - Generate report for a specific item or all items

## Backend Implementation

### Files Created
- `backend/routes/reports.js` - Main reports route with all endpoints

### API Endpoints

#### Employee Reports
- `GET /api/reports/employees/excel` - Generate employee report in Excel format
- `GET /api/reports/employees/pdf` - Generate employee report in PDF format
- `GET /api/reports/employees/list` - Get list of all employees for dropdown

**Query Parameters:**
- `month` - Month number (1-12)
- `year` - Year (e.g., 2024)
- `employeeId` - Specific employee ID or 'all'

#### Product Reports
- `GET /api/reports/products/excel` - Generate product report in Excel format
- `GET /api/reports/products/pdf` - Generate product report in PDF format
- `GET /api/reports/products/list` - Get list of all products for dropdown

**Query Parameters:**
- `month` - Month number (1-12)
- `year` - Year (e.g., 2024)
- `productId` - Specific product ID or 'all'

#### Customer Order Reports
- `GET /api/reports/orders/excel` - Generate order report in Excel format
- `GET /api/reports/orders/pdf` - Generate order report in PDF format
- `GET /api/reports/orders/list` - Get list of all orders for dropdown

**Query Parameters:**
- `month` - Month number (1-12)
- `year` - Year (e.g., 2024)
- `orderId` - Specific order ID or 'all'

#### Supplier Order Reports
- `GET /api/reports/supplier-orders/excel` - Generate supplier order report in Excel format
- `GET /api/reports/supplier-orders/pdf` - Generate supplier order report in PDF format
- `GET /api/reports/supplier-orders/list` - Get list of all supplier orders for dropdown

**Query Parameters:**
- `month` - Month number (1-12)
- `year` - Year (e.g., 2024)
- `orderId` - Specific order ID or 'all'

### Dependencies Added
```json
{
  "exceljs": "^4.x.x",
  "pdfkit": "^0.x.x"
}
```

### Authentication
All endpoints require authentication via the `fetchuser` middleware and use the `auth-token` header.

## Frontend Implementation

### Files Created
- `frontend/src/components/common/Reports.js` - Main Reports component
- `frontend/src/styles/reports.css` - Styling for Reports page

### Files Modified
- `frontend/src/App.js` - Added Reports route
- `frontend/src/components/common/SideBar.js` - Added Reports link to navigation

### Component Features

#### User Interface
1. **Report Type Selection** - Interactive cards with icons for selecting report type
2. **Format Selection** - Toggle between Excel and PDF formats
3. **Date Range Filters** - Dropdown menus for month and year selection
4. **Specific Item Selection** - Dropdown to select individual items or all items
5. **Download Button** - Primary action button to generate and download report
6. **Info Card** - Sidebar with feature highlights and usage instructions

#### State Management
```javascript
{
  reportType: 'employees' | 'products' | 'orders' | 'supplierOrders',
  format: 'excel' | 'pdf',
  month: '1-12' | '',
  year: 'YYYY' | '',
  specificId: 'itemId' | 'all'
}
```

### Styling
The Reports page follows the project's existing design system:
- Purple gradient theme (`--primary-accent: #af50ff`)
- Card-based layout with shadows
- Responsive design for mobile, tablet, and desktop
- Interactive hover states
- Accessible focus states

## Usage Instructions

### For End Users

1. **Navigate to Reports**
   - Click on the "Reports" link in the sidebar navigation

2. **Select Report Type**
   - Click on one of the four report type cards:
     - 👥 Employees
     - 📦 Products
     - 🛒 Customer Orders
     - 🚚 Supplier Orders

3. **Choose Format**
   - Click on Excel (.xlsx) or PDF (.pdf) format option

4. **Apply Filters (Optional)**
   - Select a month from the dropdown (or leave as "All Months")
   - Select a year from the dropdown (or leave as "All Years")
   - Select a specific item from the dropdown (or leave as "All Items")

5. **Download Report**
   - Click the "Download Report" button
   - The report will be generated and automatically downloaded to your device

### Example Use Cases

#### Generate Monthly Employee Report
1. Select "Employees" as report type
2. Choose format (Excel or PDF)
3. Select month: "January"
4. Select year: "2024"
5. Leave specific item as "All Items"
6. Click "Download Report"

#### Generate Individual Product Report
1. Select "Products" as report type
2. Choose format (Excel or PDF)
3. Leave month and year filters empty
4. Select specific product from dropdown
5. Click "Download Report"

#### Generate Yearly Customer Orders Report
1. Select "Customer Orders" as report type
2. Choose format (Excel or PDF)
3. Leave month as "All Months"
4. Select year: "2024"
5. Leave specific item as "All Items"
6. Click "Download Report"

## Technical Details

### Excel Report Format
- Professional headers with bold text and colored background
- Auto-fitted column widths
- Title row with report name
- Subtitle row with date range information
- Footer with generation timestamp

### PDF Report Format
- Professional layout with headers and footers
- Readable font sizes
- Organized sections for each item
- Detailed product information in nested lists
- Footer with generation timestamp

### Data Filtering Logic
```javascript
// Filter by month and year
const filterByMonthYear = (data, month, year, dateField = 'createdAt') => {
    if (!month || !year) return data;
    
    return data.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate.getMonth() + 1 === parseInt(month) && 
               itemDate.getFullYear() === parseInt(year);
    });
};
```

## Security

- All endpoints protected by authentication middleware
- Business owner isolation - users can only access their own data
- Token-based authentication using JWT
- No sensitive data exposed in URLs (passed via headers)

## Performance Considerations

- Reports are generated on-demand (not pre-cached)
- Large datasets are handled efficiently by streaming responses
- Front-end shows loading state during report generation
- Files are automatically downloaded (no server-side storage)

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Focus-visible states for all interactive components
- Semantic HTML structure
- Screen reader friendly

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive (iOS Safari, Chrome Mobile)
- File download supported on all platforms

## Future Enhancements

Potential improvements for future versions:
1. Add date range selection (from-to dates)
2. Include charts and visualizations in reports
3. Email report functionality
4. Scheduled/automated reports
5. Custom report templates
6. Additional export formats (CSV, JSON)
7. Report history/archive
8. Bulk download multiple reports

## Troubleshooting

### Common Issues

**Report not downloading:**
- Check browser's download settings
- Ensure pop-up blocker is not blocking downloads
- Verify authentication token is valid

**No data in report:**
- Verify filters are not too restrictive
- Check if data exists for selected period
- Ensure user has access to the data

**Server error:**
- Check backend server is running
- Verify database connection
- Check server logs for detailed error messages

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify all filters are correctly set
3. Try with different filter combinations
4. Contact system administrator if issues persist

---

**Version:** 1.0.0  
**Last Updated:** January 22, 2026  
**Author:** Inventory Tracker Development Team
