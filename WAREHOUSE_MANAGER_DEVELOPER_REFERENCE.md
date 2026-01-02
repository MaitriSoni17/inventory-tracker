# Warehouse Manager Selection Feature - Developer Reference

## API Endpoints

### Get Managers List
```
POST /api/warehouse/getmanagers
```

**Headers Required**:
```
Content-Type: application/json
auth-token: <valid_jwt_token>
```

**Response**:
```json
[
  {
    "_id": "ObjectId",
    "fname": "John",
    "lname": "Doe",
    "email": "john@example.com"
  },
  {
    "_id": "ObjectId",
    "fname": "Jane",
    "lname": "Smith",
    "email": "jane@example.com"
  }
]
```

**Access Control**:
- Business Owner: Can view all managers in their business
- Manager: Can view all managers in their business
- Other roles: No access (not tested)

**Error Responses**:
- 500: Internal Server Error

## Frontend Implementation Details

### Component: Warehouses
**Location**: `frontend/src/components/dashboard/BusinessOwner/Warehouses.js`

### State Management
```javascript
// Managers list from API
const [managers, setManagers] = useState([]);

// Loading indicator for async operations
const [loadingManagers, setLoadingManagers] = useState(false);

// Form data including manager selection
const [warehouseForm, setWarehouseForm] = useState({
    wName: '',
    wManager: '',        // Full manager name (display)
    wManagerId: '',      // Manager ObjectId (for selection)
    wAddress: '',
    wContact: '',
    wEmail: '',
    city: '',
    state: '',
    country: ''
});
```

### Key Functions

#### fetchManagers()
```javascript
const fetchManagers = async () => {
    try {
        setLoadingManagers(true);
        const response = await fetch('http://localhost:5000/api/warehouse/getmanagers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const data = await response.json();
            setManagers(data);
        } else {
            props.showAlert('Failed to fetch managers', 'danger');
        }
    } catch (error) {
        props.showAlert('Error fetching managers', 'danger');
    } finally {
        setLoadingManagers(false);
    }
};
```

#### handleInputChange()
```javascript
const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'wManagerId') {
        // When manager is selected from dropdown
        const selectedManager = managers.find(m => m._id === value);
        setWarehouseForm(prev => ({
            ...prev,
            wManagerId: value,
            wManager: selectedManager ? `${selectedManager.fname} ${selectedManager.lname}` : ''
        }));
    } else {
        // For other fields
        setWarehouseForm(prev => ({
            ...prev,
            [name]: value
        }));
    }
};
```

#### Navigation to Create Employee
```javascript
const navigate = useNavigate(); // From react-router-dom

// In button onClick handler
onClick={() => {
    setShowAddModal(false);      // Close warehouse modal
    resetForm();                 // Reset form state
    navigate('/dashboard/createemployee'); // Navigate to employee creation
}}
```

### Form Validation

**Before Creating/Updating Warehouse**:
```javascript
if (!warehouseForm.wName || !warehouseForm.wManager || !warehouseForm.wAddress || 
    !warehouseForm.wContact || !warehouseForm.wEmail) {
    props.showAlert('Please fill in all required fields', 'danger');
    return;
}
```

**Note**: `wManager` is populated automatically from dropdown selection, so validation passes.

## Backend Implementation Details

### Route Handler
**Location**: `backend/routes/warehouse.js`

```javascript
router.post('/getmanagers', fetchuser, async (req, res) => {
    try {
        const Employee = require('../models/Employee');
        let managers = [];

        if (req.role === 'businessowner') {
            // Business owner sees all managers in their business
            managers = await Employee.find({ 
                businessowner: req.user._id,
                role: 'manager'
            }).select('_id fname lname email');
        } else if (req.role === 'manager') {
            // Manager sees all managers in the business
            managers = await Employee.find({ 
                businessowner: req.user.businessowner,
                role: 'manager'
            }).select('_id fname lname email');
        }

        res.json(managers);
    } catch (err) {
        res.status(500).send("Internal Server error occurred");
    }
});
```

### Database Schema Reference
**Employee Model**:
```javascript
{
    businessowner: ObjectId,      // Reference to BusinessOwner
    fname: String,                // First name
    lname: String,                // Last name
    email: String,                // Email address
    role: String,                 // 'employee', 'supervisor', 'manager'
    // ... other fields
}
```

**Warehouse Model**:
```javascript
{
    businessowner: ObjectId,      // Reference to BusinessOwner
    employee: ObjectId,           // Reference to Employee (optional)
    wName: String,                // Warehouse name
    wManager: String,             // Manager name (stored as string)
    wAddress: String,             // Address
    wContact: Number,             // Contact number
    wEmail: String,               // Email address
    city: String,
    state: String,
    country: String
}
```

## Data Flow Diagram

```
User Opens Warehouse Modal
        ↓
Component mounts / useEffect triggers
        ↓
fetchManagers() called
        ↓
API Request: POST /api/warehouse/getmanagers
        ↓
Backend Query: Employee.find({ role: 'manager' })
        ↓
Returns array of managers
        ↓
setManagers(data) populates state
        ↓
Dropdown renders with manager options
        ↓
User selects manager from dropdown
        ↓
handleInputChange('wManagerId') triggers
        ↓
Find selected manager object in managers array
        ↓
Update wManager with manager's full name
        ↓
User fills other fields and submits
        ↓
Form validation passes (wManager is populated)
        ↓
POST /api/warehouse/createwarehouse or PUT /api/warehouse/updatewarehouse
```

## Browser Console Debugging

**Check if managers are loading**:
```javascript
// In browser console
localStorage.getItem('token')              // Check if token exists
```

**Expected state after fetchManagers**:
```javascript
// managers should look like:
[
  { _id: "...", fname: "John", lname: "Doe", email: "..." },
  { _id: "...", fname: "Jane", lname: "Smith", email: "..." }
]
```

## Potential Extensions

1. **Search/Filter Managers**: Add search functionality in dropdown
2. **Manager Details**: Show email when hovering over manager name
3. **Inactive Managers**: Filter out inactive managers
4. **Manager Assignment History**: Track when managers change
5. **Bulk Manager Assignment**: Assign same manager to multiple warehouses
6. **Manager Capacity**: Show number of warehouses per manager

## Performance Considerations

- Managers list is fetched once when modal opens
- Dropdown renders efficiently with React's map function
- Manager data is minimal (only _id, fname, lname, email)
- No pagination needed (typically < 100 managers per business)

## Security Considerations

✅ Authentication required (fetchuser middleware)
✅ Role-based access (Only Owner/Manager)
✅ Data isolation (Managers only see their business data)
✅ Input validation on form submission
✅ Backend validation on warehouse creation/update

## Common Issues & Solutions

### Issue: Dropdown shows "[object Object]"
**Cause**: Rendering issue in select options
**Solution**: Verify manager object structure in map function

### Issue: Manager name not saving to warehouse
**Cause**: wManager field not being sent in request
**Solution**: Check handleInputChange and form submission logic

### Issue: New manager not appearing in dropdown immediately
**Cause**: Dropdown uses cached manager list
**Solution**: Refresh page or re-open modal to fetch fresh data

### Issue: Navigation error when clicking "+" button
**Cause**: useNavigate hook not imported
**Solution**: Verify `import { useNavigate } from 'react-router-dom'` at top of file

## Testing Scenarios

1. **Happy Path**: Add warehouse with existing manager
2. **Add New Manager**: Click "+" → Create employee → Return and verify in dropdown
3. **Edit Warehouse**: Change manager assignment
4. **Validation**: Try adding warehouse without selecting manager
5. **Multiple Managers**: Verify all managers appear in dropdown
6. **Role Filtering**: Verify only "manager" role employees appear
7. **Business Isolation**: Managers only see their business's managers
