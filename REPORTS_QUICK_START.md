# Reports Feature - Quick Start Guide

## Prerequisites
- Backend server running on port 5000
- Frontend server running (usually port 3000)
- User logged in with valid authentication token
- Sample data in database (employees, products, orders, supplier orders)

## Backend Setup

### 1. Install Dependencies
The required packages have already been installed:
```bash
cd backend
npm install exceljs pdfkit
```

### 2. Start Backend Server
```bash
cd backend
npm start
# or for development
npm run dev
```

The reports endpoints will be available at:
- http://localhost:5000/api/reports/*

## Frontend Setup

### 1. Start Frontend Server
```bash
cd frontend
npm start
```

### 2. Access Reports Page
1. Login to the application
2. Navigate to Dashboard
3. Click on "Reports" in the sidebar (📊 Reports)

## Testing the Reports Feature

### Test 1: Generate Employee Report (Excel)
1. On the Reports page, click on the "👥 Employees" card
2. Select format: "Excel (.xlsx)"
3. Leave filters empty (to get all employees)
4. Click "Download Report"
5. Verify Excel file downloads with employee data

### Test 2: Generate Product Report (PDF)
1. Select report type: "📦 Products"
2. Select format: "PDF (.pdf)"
3. Select month: "January" (or current month)
4. Select year: Current year
5. Click "Download Report"
6. Verify PDF file downloads with filtered product data

### Test 3: Generate Specific Order Report
1. Select report type: "🛒 Customer Orders"
2. Select format: "Excel (.xlsx)"
3. Leave date filters empty
4. From "Select Specific Item" dropdown, choose a specific order
5. Click "Download Report"
6. Verify only that specific order appears in the report

### Test 4: Generate Supplier Orders Report
1. Select report type: "🚚 Supplier Orders"
2. Select format: "PDF (.pdf)"
3. Select year: Current year
4. Leave month as "All Months"
5. Leave item as "All Items"
6. Click "Download Report"
7. Verify all supplier orders for the year appear in PDF

## Verification Checklist

### Backend Verification
- [ ] Reports route registered in `backend/index.js`
- [ ] `backend/routes/reports.js` file exists
- [ ] All 8 main endpoints responding (4 types × 2 formats)
- [ ] Helper endpoints returning data lists
- [ ] Authentication middleware working
- [ ] No console errors in backend

### Frontend Verification
- [ ] Reports component created at `frontend/src/components/common/Reports.js`
- [ ] Reports styling file created at `frontend/src/styles/reports.css`
- [ ] Reports route added to `App.js`
- [ ] Reports link appears in sidebar
- [ ] Reports page loads without errors
- [ ] All UI elements render correctly
- [ ] Loading state shows during report generation
- [ ] Success/error alerts display properly

### Functionality Verification
- [ ] Can select different report types
- [ ] Can toggle between Excel and PDF formats
- [ ] Month dropdown populates correctly
- [ ] Year dropdown shows last 10 years
- [ ] Specific item dropdowns load dynamically based on report type
- [ ] Reports download successfully
- [ ] Downloaded files open correctly
- [ ] File names include timestamp
- [ ] Reports contain correct data
- [ ] Filters work as expected

### UI/UX Verification
- [ ] Page matches project's design theme (purple gradient)
- [ ] Cards have hover effects
- [ ] Active states highlight correctly
- [ ] Responsive on mobile devices
- [ ] Responsive on tablets
- [ ] Sidebar info card displays properly
- [ ] Icons display correctly
- [ ] Buttons are properly styled
- [ ] Loading spinner shows when generating report

## Sample API Requests

### Get All Employees Report (Excel)
```
GET http://localhost:5000/api/reports/employees/excel
Headers:
  auth-token: <your-jwt-token>
```

### Get Filtered Products Report (PDF)
```
GET http://localhost:5000/api/reports/products/pdf?month=1&year=2024
Headers:
  auth-token: <your-jwt-token>
```

### Get Specific Order Report (Excel)
```
GET http://localhost:5000/api/reports/orders/excel?orderId=<order-id>
Headers:
  auth-token: <your-jwt-token>
```

### Get Employee List
```
GET http://localhost:5000/api/reports/employees/list
Headers:
  auth-token: <your-jwt-token>
```

## Expected File Outputs

### Excel Report Structure
```
Row 1: [Title] "Employee Report" (merged, bold, centered)
Row 2: [Subtitle] "Report for January 2024" (merged, centered)
Row 3: [Empty]
Row 4: [Headers] Bold with colored background
Row 5+: [Data] One row per item
```

### PDF Report Structure
```
Header: Report Title (large, bold)
Subtitle: Date range information
Body: List of items with details
  - Item 1 (underlined header)
    - Field 1: Value
    - Field 2: Value
    ...
  - Item 2
    ...
Footer: Generation timestamp
```

## Troubleshooting

### Backend Issues

**Error: Cannot find module 'exceljs'**
```bash
cd backend
npm install exceljs pdfkit
```

**Error: Route not found**
- Verify `backend/routes/reports.js` exists
- Check `backend/index.js` has the line: `app.use('/api/reports', require('./routes/reports'));`
- Restart backend server

**Error: Unauthorized**
- Check authentication token is valid
- Verify `auth-token` header is being sent
- Login again to get fresh token

### Frontend Issues

**Reports link not showing in sidebar**
- Check `SideBar.js` has the Reports link
- Clear browser cache
- Restart frontend server

**Reports page showing blank**
- Check browser console for errors
- Verify Reports component import in `App.js`
- Check CSS file is imported correctly

**Download not working**
- Check browser's download settings
- Disable pop-up blocker for localhost
- Check browser console for errors
- Verify backend endpoint is responding

## Next Steps

After successful testing:
1. ✅ Verify all report types work
2. ✅ Test with different user roles
3. ✅ Test with large datasets
4. ✅ Test on different browsers
5. ✅ Test on mobile devices
6. 📝 Update user documentation
7. 🚀 Deploy to production

## Support

If you encounter any issues:
1. Check the browser console (F12)
2. Check the backend server logs
3. Verify database has sample data
4. Review the API endpoints in Postman/Insomnia
5. Check the Reports Documentation for detailed information

---

**Happy Testing! 📊✨**
