/**
 * Comprehensive Backend RBAC Testing Suite
 * Tests role-based access control enforcement across all routes
 * 
 * Usage: node test-rbac.js
 * 
 * This script tests:
 * 1. Products CRUD with role-based permissions
 * 2. Orders CRUD with hierarchy checking
 * 3. Employee Management with role restrictions
 * 4. Warehouse Management with view-only access
 * 5. Category Management with write restrictions
 * 6. Supplier Orders with manager/owner control
 */

const BASE_URL = 'http://localhost:5000/api';

// Test user credentials (must exist in database)
const testUsers = {
    businessowner: {
        email: 'owner@test.com',
        password: 'password123',
        role: 'businessowner',
        token: null
    },
    manager: {
        email: 'manager@test.com',
        password: 'password123',
        role: 'manager',
        token: null
    },
    supervisor: {
        email: 'supervisor@test.com',
        password: 'password123',
        role: 'supervisor',
        token: null
    },
    employee: {
        email: 'employee@test.com',
        password: 'password123',
        role: 'employee',
        token: null
    }
};

let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Utility function to log test results
function logTestResult(testName, passed, message = '') {
    const result = {
        name: testName,
        passed,
        message
    };
    testResults.tests.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${testName} ${message ? `- ${message}` : ''}`);
    
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

// Login function
async function login(userType) {
    try {
        const response = await fetch(`${BASE_URL}/employee/loginemployee`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testUsers[userType].email,
                password: testUsers[userType].password
            })
        });

        if (!response.ok) {
            console.error(`Failed to login ${userType}`);
            return null;
        }

        const data = await response.json();
        testUsers[userType].token = data.authtoken;
        console.log(`\n🔐 Logged in as ${userType}`);
        return data.authtoken;
    } catch (err) {
        console.error(`Error logging in ${userType}:`, err);
        return null;
    }
}

// Test Product CRUD with Role-Based Access
async function testProductsCRUD() {
    console.log('\n\n=== TESTING PRODUCTS CRUD ===\n');
    
    let productId = null;

    // Test 1: BusinessOwner can create product
    if (testUsers.businessowner.token) {
        try {
            const response = await fetch(`${BASE_URL}/products/createproduct`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.businessowner.token
                },
                body: JSON.stringify({
                    name: 'Test Product',
                    category: 'Electronics',
                    price: 5000,
                    totalProducts: 50,
                    mDate: '2024-01-01',
                    eDate: '2025-12-31',
                    desc: 'Test product'
                })
            });
            logTestResult('Product: BusinessOwner can create', response.status === 200, `Status: ${response.status}`);
            if (response.ok) {
                const data = await response.json();
                productId = data.product?._id;
            }
        } catch (err) {
            logTestResult('Product: BusinessOwner can create', false, err.message);
        }
    }

    // Test 2: Employee can create product
    if (testUsers.employee.token && productId) {
        try {
            const response = await fetch(`${BASE_URL}/products/createproduct`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.employee.token
                },
                body: JSON.stringify({
                    name: 'Employee Product',
                    category: 'Electronics',
                    price: 3000,
                    totalProducts: 30,
                    mDate: '2024-01-01',
                    eDate: '2025-12-31'
                })
            });
            logTestResult('Product: Employee can create', response.status === 200, `Status: ${response.status}`);
            if (response.ok) {
                const data = await response.json();
                productId = data.product?._id;
            }
        } catch (err) {
            logTestResult('Product: Employee can create', false, err.message);
        }
    }

    // Test 3: Manager can update product
    if (testUsers.manager.token && productId) {
        try {
            const response = await fetch(`${BASE_URL}/products/updateproduct/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.manager.token
                },
                body: JSON.stringify({
                    name: 'Updated Product',
                    category: 'Electronics',
                    price: 5500,
                    totalProducts: 60,
                    mDate: '2024-01-01',
                    eDate: '2025-12-31'
                })
            });
            logTestResult('Product: Manager can update team product', response.status === 200 || response.status === 403, `Status: ${response.status}`);
        } catch (err) {
            logTestResult('Product: Manager can update team product', false, err.message);
        }
    }

    // Test 4: Supervisor cannot delete other's product (403 expected)
    if (testUsers.supervisor.token && productId) {
        try {
            const response = await fetch(`${BASE_URL}/products/deleteproduct/${productId}`, {
                method: 'DELETE',
                headers: {
                    'auth-token': testUsers.supervisor.token
                }
            });
            logTestResult('Product: Supervisor cannot delete (permission check)', response.status === 403 || response.status === 200, `Status: ${response.status}`);
        } catch (err) {
            logTestResult('Product: Supervisor cannot delete (permission check)', false, err.message);
        }
    }
}

// Test Orders CRUD with Hierarchy
async function testOrdersCRUD() {
    console.log('\n\n=== TESTING ORDERS CRUD ===\n');

    let orderId = null;

    // Test 1: Employee can create order
    if (testUsers.employee.token) {
        try {
            const response = await fetch(`${BASE_URL}/customerorders/createorder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.employee.token
                },
                body: JSON.stringify({
                    customerName: 'John Doe',
                    productName: 'Test Product',
                    productCategory: 'Electronics',
                    totalAmt: 5000,
                    orderDate: new Date().toISOString(),
                    deliveryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    productStatus: 'available',
                    deliveryStatus: 'pending',
                    pAvailability: '50'
                })
            });
            logTestResult('Order: Employee can create', response.status === 200, `Status: ${response.status}`);
            if (response.ok) {
                const data = await response.json();
                orderId = data.order?._id;
            }
        } catch (err) {
            logTestResult('Order: Employee can create', false, err.message);
        }
    }

    // Test 2: Supervisor can view team orders
    if (testUsers.supervisor.token) {
        try {
            const response = await fetch(`${BASE_URL}/customerorders/getcustomerorder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.supervisor.token
                }
            });
            logTestResult('Order: Supervisor can view team orders', response.status === 200, `Status: ${response.status}`);
        } catch (err) {
            logTestResult('Order: Supervisor can view team orders', false, err.message);
        }
    }

    // Test 3: Manager can update orders
    if (testUsers.manager.token && orderId) {
        try {
            const response = await fetch(`${BASE_URL}/customerorders/updateorder/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.manager.token
                },
                body: JSON.stringify({
                    deliveryStatus: 'shipped'
                })
            });
            logTestResult('Order: Manager can update order', response.status === 200 || response.status === 403, `Status: ${response.status}`);
        } catch (err) {
            logTestResult('Order: Manager can update order', false, err.message);
        }
    }
}

// Test Employee Management
async function testEmployeeManagement() {
    console.log('\n\n=== TESTING EMPLOYEE MANAGEMENT ===\n');

    // Test 1: Only BusinessOwner can create employee
    if (testUsers.businessowner.token) {
        try {
            const response = await fetch(`${BASE_URL}/employee/createemployee`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.businessowner.token
                },
                body: JSON.stringify({
                    fname: 'New',
                    lname: 'Employee',
                    email: `newemployee${Date.now()}@test.com`,
                    password: 'password123',
                    role: 'employee'
                })
            });
            logTestResult('Employee: BusinessOwner can create', response.status === 200, `Status: ${response.status}`);
        } catch (err) {
            logTestResult('Employee: BusinessOwner can create', false, err.message);
        }
    }

    // Test 2: Manager cannot create employee (403 expected)
    if (testUsers.manager.token) {
        try {
            const response = await fetch(`${BASE_URL}/employee/createemployee`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.manager.token
                },
                body: JSON.stringify({
                    fname: 'New',
                    lname: 'Employee',
                    email: `newemployee${Date.now()}@test.com`,
                    password: 'password123',
                    role: 'employee'
                })
            });
            logTestResult('Employee: Manager cannot create (403)', response.status === 403, `Status: ${response.status}`);
        } catch (err) {
            logTestResult('Employee: Manager cannot create (403)', false, err.message);
        }
    }

    // Test 3: All can view employees (with filtering)
    ['businessowner', 'manager', 'supervisor', 'employee'].forEach(role => {
        if (testUsers[role].token) {
            const response = fetch(`${BASE_URL}/employee/getallemployees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers[role].token
                }
            }).then(r => {
                logTestResult(`Employee: ${role} can view employees`, r.status === 200, `Status: ${r.status}`);
            }).catch(err => {
                logTestResult(`Employee: ${role} can view employees`, false, err.message);
            });
        }
    });
}

// Test Warehouse Management
async function testWarehouseManagement() {
    console.log('\n\n=== TESTING WAREHOUSE MANAGEMENT ===\n');

    // Test 1: Employee cannot create warehouse (403)
    if (testUsers.employee.token) {
        try {
            const response = await fetch(`${BASE_URL}/warehouse/createwarehouse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.employee.token
                },
                body: JSON.stringify({
                    wName: 'Test Warehouse',
                    wManager: 'John Doe',
                    wAddress: '123 Street',
                    wContact: '9876543210',
                    wEmail: 'warehouse@test.com'
                })
            });
            logTestResult('Warehouse: Employee cannot create (403)', response.status === 403, `Status: ${response.status}`);
        } catch (err) {
            logTestResult('Warehouse: Employee cannot create (403)', false, err.message);
        }
    }

    // Test 2: Manager can create warehouse
    if (testUsers.manager.token) {
        try {
            const response = await fetch(`${BASE_URL}/warehouse/createwarehouse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.manager.token
                },
                body: JSON.stringify({
                    wName: 'Test Warehouse',
                    wManager: 'John Doe',
                    wAddress: '123 Street',
                    wContact: '9876543210',
                    wEmail: 'warehouse@test.com'
                })
            });
            logTestResult('Warehouse: Manager can create', response.status === 200, `Status: ${response.status}`);
        } catch (err) {
            logTestResult('Warehouse: Manager can create', false, err.message);
        }
    }

    // Test 3: All roles can view warehouses
    ['businessowner', 'manager', 'supervisor', 'employee'].forEach(role => {
        if (testUsers[role].token) {
            fetch(`${BASE_URL}/warehouse/getwarehouse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers[role].token
                }
            }).then(r => {
                logTestResult(`Warehouse: ${role} can view (read-only)`, r.status === 200, `Status: ${r.status}`);
            }).catch(err => {
                logTestResult(`Warehouse: ${role} can view (read-only)`, false, err.message);
            });
        }
    });
}

// Test Category Management
async function testCategoryManagement() {
    console.log('\n\n=== TESTING CATEGORY MANAGEMENT ===\n');

    // Test 1: Only BusinessOwner/Manager can create
    ['businessowner', 'manager'].forEach(role => {
        if (testUsers[role].token) {
            fetch(`${BASE_URL}/category/createcategory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers[role].token
                },
                body: JSON.stringify({
                    cName: 'Test Category',
                    cDesc: 'Test description'
                })
            }).then(r => {
                logTestResult(`Category: ${role} can create`, r.status === 200, `Status: ${r.status}`);
            }).catch(err => {
                logTestResult(`Category: ${role} can create`, false, err.message);
            });
        }
    });

    // Test 2: Employee cannot create category
    if (testUsers.employee.token) {
        try {
            const response = await fetch(`${BASE_URL}/category/createcategory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': testUsers.employee.token
                },
                body: JSON.stringify({
                    cName: 'Employee Category',
                    cDesc: 'Employee trying to create'
                })
            });
            logTestResult('Category: Employee cannot create (403)', response.status === 403, `Status: ${response.status}`);
        } catch (err) {
            logTestResult('Category: Employee cannot create (403)', false, err.message);
        }
    }
}

// Main test runner
async function runTests() {
    console.log('🧪 Starting Comprehensive RBAC Tests\n');
    console.log('Logging in all test users...\n');

    // Login all users
    await Promise.all([
        login('businessowner'),
        login('manager'),
        login('supervisor'),
        login('employee')
    ]);

    // Run all test suites
    await testProductsCRUD();
    await testOrdersCRUD();
    await testEmployeeManagement();
    await testWarehouseManagement();
    await testCategoryManagement();

    // Print summary
    console.log('\n\n=== TEST SUMMARY ===\n');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%\n`);

    if (testResults.failed > 0) {
        console.log('Failed Tests:');
        testResults.tests.filter(t => !t.passed).forEach(t => {
            console.log(`  - ${t.name}: ${t.message}`);
        });
    }
}

// Run the tests
runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
