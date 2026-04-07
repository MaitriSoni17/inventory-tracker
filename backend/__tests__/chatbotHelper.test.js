jest.mock('../utils/chatbotCache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
  startCleanup: jest.fn()
}));

jest.mock('../models/CustomerOrders', () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/Products', () => ({
  countDocuments: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/Warehouse', () => ({
  countDocuments: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/Supplier', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../models/Employee', () => ({
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../models/BusinessOwner', () => ({
  findById: jest.fn()
}));

jest.mock('../models/ChatHistory', () => ({
  create: jest.fn()
}));

jest.mock('../models/SalaryPayment', () => ({
  aggregate: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/SupplierOrders', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/Category', () => ({
  find: jest.fn()
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

jest.mock('groq-sdk', () => ({
  Groq: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

const CustomerOrders = require('../models/CustomerOrders');
const Product = require('../models/Products');
const Warehouse = require('../models/Warehouse');
const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');
const ChatHistory = require('../models/ChatHistory');
const SalaryPayment = require('../models/SalaryPayment');
const SupplierOrders = require('../models/SupplierOrders');
const Category = require('../models/Category');
const chatbotCache = require('../utils/chatbotCache');

const { getSalaryResponse, getEmployeeDetailsResponse, getEmployeeSalaryResponse, generateAIResponse } = require('../utils/chatbotHelper');

const makeChain = (value) => {
  const chain = {
    select: jest.fn(() => chain),
    populate: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(value)),
    sort: jest.fn(() => chain),
    lean: jest.fn(() => chain)
  };

  return chain;
};

const makeSelectLimitChain = (value) => ({
  select: jest.fn(() => ({
    sort: jest.fn(() => ({
      limit: jest.fn(() => Promise.resolve(value))
    })),
    limit: jest.fn(() => Promise.resolve(value))
  }))
});

const makeSelectLeanChain = (value) => ({
  select: jest.fn(() => ({
    lean: jest.fn(() => Promise.resolve(value))
  }))
});

const makeSelectSortLimitLeanChain = (value) => ({
  select: jest.fn(() => ({
    sort: jest.fn(() => ({
      limit: jest.fn(() => ({
        lean: jest.fn(() => Promise.resolve(value))
      }))
    }))
  }))
});

const makeSelectPopulateSortLimitLeanChain = (value) => ({
  select: jest.fn(() => ({
    populate: jest.fn(() => ({
      sort: jest.fn(() => ({
        limit: jest.fn(() => ({
          lean: jest.fn(() => Promise.resolve(value))
        }))
      }))
    }))
  }))
});

const BUSINESS_OWNER_ID = '64f1c2a1b2c3d4e5f6789012';
const EMPLOYEE_ID = '64f1c2a1b2c3d4e5f6789013';

describe('chatbot salary handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chatbotCache.get.mockReturnValue(null);
    chatbotCache.set.mockImplementation(() => {});
    ChatHistory.create.mockResolvedValue({});
  });

  test('business owner salary response includes assigned employee salaries', () => {
    const employees = [
      {
        _id: 'e1',
        fname: 'Manager',
        lname: 'One',
        email: 'manager1@test.com',
        phone: '1234567890',
        role: 'manager',
        jDate: '2024-01-15',
        salary: {
          baseSalary: 10000,
          currency: 'INR',
          paymentFrequency: 'monthly',
          lastUpdated: '2026-04-01T00:00:00.000Z'
        }
      },
      {
        _id: 'e2',
        fname: 'Employee',
        lname: 'Two',
        email: 'employee2@test.com',
        phone: '0987654321',
        role: 'employee',
        jDate: '2024-02-01',
        salary: {
          baseSalary: 0,
          currency: 'INR',
          paymentFrequency: 'monthly'
        }
      }
    ];

    const response = getSalaryResponse({
      employeesList: employees,
      totalSalaryPaid: 500,
      salaryPaymentCount: 1,
      recentSalaryPayments: []
    });

    expect(response).toContain('Manager One');
    expect(response).toContain('₹10,000');
    expect(response).toContain('Employees with salary assigned');
    expect(response).toContain('Total payroll commitment');
    expect(response).toContain('Total Salary Paid');
  });

  test('business owner team details include salary lines', () => {
    const employees = [
      {
        _id: 'e1',
        fname: 'Manager',
        lname: 'One',
        email: 'manager1@test.com',
        phone: '1234567890',
        role: 'manager',
        jDate: '2024-01-15',
        salary: {
          baseSalary: 10000,
          currency: 'INR',
          paymentFrequency: 'monthly',
          lastUpdated: '2026-04-01T00:00:00.000Z'
        }
      },
      {
        _id: 'e2',
        fname: 'Employee',
        lname: 'Two',
        email: 'employee2@test.com',
        phone: '0987654321',
        role: 'employee',
        jDate: '2024-02-01',
        salary: {
          baseSalary: 0,
          currency: 'INR',
          paymentFrequency: 'monthly'
        }
      }
    ];

    const response = getEmployeeDetailsResponse('businessowner', {
      employeesList: employees,
      employees: employees.length
    });

    expect(response).toContain('Manager One');
    expect(response).toContain('Salary:');
    expect(response).toContain('₹10,000');
    expect(response).toContain('SALARY SUMMARY');
  });

  test('employee salary response includes payment history', () => {
    const response = getEmployeeSalaryResponse({
      mySalaryPayments: [
        {
          amount: 8000,
          paymentDate: '2026-03-31T00:00:00.000Z',
          paymentMethod: 'bank_transfer',
          paymentPeriod: 'March 2026',
          status: 'completed'
        }
      ]
    });

    expect(response).toContain('YOUR SALARY PAYMENTS');
    expect(response).toContain('₹8000');
    expect(response).toContain('March 2026');
  });

  test('chatbot fetches specific employee details by email', async () => {
    Employee.find.mockReturnValue(makeChain([
      {
        _id: 'e1',
        fname: 'Manager',
        lname: 'One',
        email: 'manager1@test.com',
        phone: '1234567890',
        role: 'manager',
        jDate: '2024-01-15',
        isActive: true,
        warehouse: { wName: 'Warehouse1' },
        salary: {
          baseSalary: 10000,
          currency: 'INR',
          paymentFrequency: 'monthly'
        }
      }
    ]));

    const response = await generateAIResponse(
      'Show employee details for manager1@test.com',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('EMPLOYEE DETAILS');
    expect(response).toContain('manager1@test.com');
    expect(response).toContain('Role: manager');
    expect(response).toContain('₹10,000');
  });

  test('chatbot fetches specific employee details by role', async () => {
    Employee.find.mockReturnValue(makeChain([
      {
        _id: 'e1',
        fname: 'Manager',
        lname: 'One',
        email: 'manager1@test.com',
        phone: '1234567890',
        role: 'manager',
        jDate: '2024-01-15',
        isActive: true,
        warehouse: { wName: 'Warehouse1' },
        salary: {
          baseSalary: 10000,
          currency: 'INR',
          paymentFrequency: 'monthly'
        }
      }
    ]));

    const response = await generateAIResponse(
      'Show employee details role manager',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('EMPLOYEE DETAILS');
    expect(response).toContain('Role: manager');
    expect(response).toContain('manager1@test.com');
  });

  test('chatbot fetches specific employee details by name', async () => {
    Employee.find.mockReturnValue(makeChain([
      {
        _id: 'e1',
        fname: 'Manager',
        lname: 'One',
        email: 'manager1@test.com',
        phone: '1234567890',
        role: 'manager',
        jDate: '2024-01-15',
        isActive: true,
        warehouse: { wName: 'Warehouse1' },
        salary: {
          baseSalary: 10000,
          currency: 'INR',
          paymentFrequency: 'monthly'
        }
      }
    ]));

    const response = await generateAIResponse(
      'Show employee details for Manager',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('EMPLOYEE DETAILS');
    expect(response).toContain('Manager One');
    expect(response).toContain('manager1@test.com');
  });
});

describe('chatbot new query coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chatbotCache.get.mockReturnValue(null);
    chatbotCache.set.mockImplementation(() => {});
    ChatHistory.create.mockResolvedValue({});
  });

  test('asks for product clarification when product name is missing', async () => {
    const response = await generateAIResponse(
      'Can you share product details?',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('I understand you want product details');
    expect(response).toContain('show me details for product Product1');
  });

  test('returns single product details for new item query phrasing', async () => {
    Category.find
      .mockReturnValueOnce(makeSelectLeanChain([]))
      .mockReturnValueOnce(makeSelectLeanChain([]));
    Warehouse.find.mockReturnValue(makeSelectLeanChain([]));
    Product.find.mockReturnValue(makeSelectLimitChain([
      {
        name: 'Alpha Mix',
        category: 'Snacks',
        price: 1299,
        totalProducts: 24,
        brand: 'Inline',
        warehouse: []
      }
    ]));

    const response = await generateAIResponse(
      'Need availability and price of item named "Alpha Mix"',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('Alpha Mix');
    expect(response).toContain('₹1299');
    expect(response).toContain('In Stock');
  });

  test('returns category details for quoted category query', async () => {
    Category.find.mockResolvedValue([
      {
        _id: 'c1',
        cName: 'Beverages',
        cDesc: 'Tea and coffee products'
      }
    ]);
    Product.countDocuments.mockResolvedValue(6);

    const response = await generateAIResponse(
      'Give me information on "Beverages" category',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('CATEGORIES');
    expect(response).toContain('Beverages');
    expect(response).toContain('Products: 6 items');
  });

  test('returns warehouse details for location-style query', async () => {
    Warehouse.find.mockReturnValue({
      select: jest.fn(() => Promise.resolve([
        {
          wName: 'Central Hub',
          wManager: 'Riya Singh',
          wAddress: 'MG Road',
          wContact: '9998887776',
          wEmail: 'central@inline.com',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India'
        }
      ]))
    });

    const response = await generateAIResponse(
      'Share location details for Central Hub warehouse',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('WAREHOUSES');
    expect(response).toContain('Central Hub');
    expect(response).toContain('Bengaluru');
  });

  test('returns order details for conversational order lookup query', async () => {
    CustomerOrders.find.mockReturnValue(makeSelectLimitChain([
      {
        cName: 'Rahul Sharma',
        pName: 'Alpha Mix',
        amount: 2500,
        oDate: '2026-03-20T00:00:00.000Z',
        dDate: '2026-03-25T00:00:00.000Z',
        status: 'Pending',
        dStatus: 'Not shipped',
        cAddress: 'Indiranagar, Bengaluru'
      }
    ]));

    const response = await generateAIResponse(
      'Could you show info about order for Rahul?',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('ORDER DETAILS');
    expect(response).toContain('Rahul Sharma');
    expect(response).toContain('₹2500');
  });

  test('returns order details for customer2 query phrasing', async () => {
    CustomerOrders.find.mockReturnValue(makeSelectLimitChain([
      {
        cName: 'Customer2',
        pName: 'Beta Pack',
        amount: 3100,
        oDate: '2026-03-22T00:00:00.000Z',
        dDate: '2026-03-28T00:00:00.000Z',
        status: 'Processing',
        dStatus: 'Shipped',
        cAddress: 'HSR Layout, Bengaluru'
      }
    ]));

    const response = await generateAIResponse(
      'Can you please share order details of Customer2?',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('ORDER DETAILS');
    expect(response).toContain('Customer2');
    expect(response).toContain('₹3100');
  });

  test('returns order details when searched by customer email', async () => {
    CustomerOrders.find.mockReturnValue(makeSelectLimitChain([
      {
        cName: 'Customer1',
        cEmail: 'customer1@test.com',
        pName: 'Alpha Mix',
        amount: 2800,
        oDate: '2026-03-20T00:00:00.000Z',
        dDate: '2026-03-25T00:00:00.000Z',
        status: 'Pending',
        dStatus: 'Not shipped',
        cAddress: 'Indiranagar, Bengaluru'
      }
    ]));

    const response = await generateAIResponse(
      'Show order for customer1@test.com',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('ORDER DETAILS');
    expect(response).toContain('(1 found)');
    expect(response).toContain('Customer1');
    expect(response).toContain('₹2800');
  });

  test('returns order details for near-match customer email local-part', async () => {
    CustomerOrders.find
      .mockReturnValueOnce(makeSelectLimitChain([]))
      .mockReturnValueOnce(makeSelectLimitChain([
        {
          cName: 'Customer1',
          cEmail: 'customer@test.com',
          pName: 'Alpha Mix',
          amount: 2800,
          oDate: '2026-03-20T00:00:00.000Z',
          dDate: '2026-03-25T00:00:00.000Z',
          status: 'Pending',
          dStatus: 'Not shipped',
          cAddress: 'Indiranagar, Bengaluru'
        }
      ]));

    const response = await generateAIResponse(
      'Show order for customer1@test.com',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('ORDER DETAILS');
    expect(response).toContain('(1 found)');
    expect(response).toContain('Customer1');
    expect(response).toContain('₹2800');
  });

  test('returns order details when searched by customer phone', async () => {
    CustomerOrders.find.mockReturnValue(makeSelectLimitChain([
      {
        cName: 'Customer1',
        cPhone: 9876543210,
        pName: 'Alpha Mix',
        amount: 2800,
        oDate: '2026-03-20T00:00:00.000Z',
        dDate: '2026-03-25T00:00:00.000Z',
        status: 'Pending',
        dStatus: 'Not shipped',
        cAddress: 'Indiranagar, Bengaluru'
      }
    ]));

    const response = await generateAIResponse(
      'Show order for 9876543210',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('ORDER DETAILS');
    expect(response).toContain('(1 found)');
    expect(response).toContain('Customer1');
    expect(response).toContain('₹2800');
  });

  test('returns full employee list for generic employee list query', async () => {
    Employee.find.mockReturnValue(makeChain([
      {
        _id: 'e1',
        fname: 'Manager',
        lname: 'One',
        email: 'manager1@test.com',
        phone: '1234567890',
        role: 'manager',
        jDate: '2024-01-15',
        isActive: true,
        warehouse: { wName: 'Warehouse1' },
        salary: {
          baseSalary: 10000,
          currency: 'INR',
          paymentFrequency: 'monthly'
        }
      },
      {
        _id: 'e2',
        fname: 'Employee',
        lname: 'Two',
        email: 'employee2@test.com',
        phone: '9988776655',
        role: 'employee',
        jDate: '2024-02-01',
        isActive: true,
        warehouse: { wName: 'Warehouse2' },
        salary: {
          baseSalary: 7000,
          currency: 'INR',
          paymentFrequency: 'monthly'
        }
      }
    ]));

    const response = await generateAIResponse(
      'Show all employees list',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('EMPLOYEE DETAILS');
    expect(response).toContain('all employees');
    expect(response).toContain('manager1@test.com');
    expect(response).toContain('employee2@test.com');
  });

  test('returns product list for generic product list query', async () => {
    Product.find.mockReturnValue({
      select: jest.fn(() => ({
        sort: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve([
            {
              name: 'Alpha Mix',
              category: 'Snacks',
              price: 1299,
              totalProducts: 24,
              brand: 'Inline',
              warehouse: []
            },
            {
              name: 'Beta Pack',
              category: 'Beverages',
              price: 899,
              totalProducts: 8,
              brand: 'Inline',
              warehouse: []
            }
          ]))
        }))
      }))
    });
    Category.find.mockReturnValue(makeSelectLeanChain([]));
    Warehouse.find.mockReturnValue(makeSelectLeanChain([]));

    const response = await generateAIResponse(
      'Show all products list',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('PRODUCT DETAILS');
    expect(response).toContain('Alpha Mix');
    expect(response).toContain('Beta Pack');
  });

  test('returns order list for generic order list query', async () => {
    CustomerOrders.find.mockReturnValue({
      select: jest.fn(() => ({
        sort: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve([
            {
              cName: 'Rahul Sharma',
              pName: 'Alpha Mix',
              amount: 2500,
              oDate: '2026-03-20T00:00:00.000Z',
              dDate: '2026-03-25T00:00:00.000Z',
              status: 'Pending',
              dStatus: 'Not shipped'
            },
            {
              cName: 'Customer2',
              pName: 'Beta Pack',
              amount: 3100,
              oDate: '2026-03-22T00:00:00.000Z',
              dDate: '2026-03-28T00:00:00.000Z',
              status: 'Processing',
              dStatus: 'Shipped'
            }
          ]))
        }))
      }))
    });

    const response = await generateAIResponse(
      'Show all orders list',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('ORDER DETAILS');
    expect(response).toContain('Rahul Sharma');
    expect(response).toContain('Customer2');
  });

  test('returns a step-by-step website guide for add product queries', async () => {
    const response = await generateAIResponse(
      'How do I add a product?',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('HOW TO USE THE WEBSITE');
    expect(response).toContain('To add a product');
    expect(response).toContain('left sidebar and choose Products');
    expect(response).toContain('Click Add Product');
    expect(response).toContain('Fill in the product name, category, price, stock, and warehouse');
  });

  test('returns the edit path for update product detail queries', async () => {
    const response = await generateAIResponse(
      'How can I update product details?',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('HOW TO USE THE WEBSITE');
    expect(response).toContain('To update a product');
    expect(response).toContain('Open the left sidebar and choose Products');
    expect(response).toContain('Click Edit Product');
  });

  test('returns permission guidance for supervisor category access query', async () => {
    const response = await generateAIResponse(
      'How can I give category management permission to supervisor individually?',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('HOW TO USE THE WEBSITE');
    expect(response).toContain('Permissions');
    expect(response).toContain('Individual Permissions');
    expect(response).toContain('Select the employee or supervisor you want to update');
    expect(response).toContain('category access');
  });

  test('returns direct order edit ability guidance', async () => {
    const response = await generateAIResponse(
      'Am I able to edit order?',
      'businessowner',
      {},
      BUSINESS_OWNER_ID,
      {
        _id: BUSINESS_OWNER_ID,
        role: 'businessowner',
        permissions: {
          canViewOrders: true,
          canEditOrders: true
        }
      }
    );

    expect(response).toContain('Yes, you can edit orders');
    expect(response).toContain('Open the left sidebar and choose Orders');
    expect(response).toContain('Edit Order');
  });

  test('denies order edit ability when permission is missing', async () => {
    const response = await generateAIResponse(
      'Can I edit order?',
      'employee',
      {},
      EMPLOYEE_ID,
      {
        _id: EMPLOYEE_ID,
        role: 'employee',
        permissions: {
          canViewOrders: true,
          canEditOrders: false
        }
      }
    );

    expect(response).toContain('Not with your current access');
    expect(response).toContain('canEditOrders');
    expect(response).toContain('Permissions');
  });

  test('returns supplier-specific report guide path', async () => {
    const response = await generateAIResponse(
      'How do I download my order report?',
      'supplier',
      {},
      '64f1c2a1b2c3d4e5f6789014'
    );

    expect(response).toContain('HOW TO USE THE WEBSITE');
    expect(response).toContain('Dashboard > Reports');
    expect(response).toContain('My Orders');
    expect(response).toContain('Excel or PDF');
  });

  test('supplier generic report how-to query returns report guidance', async () => {
    const response = await generateAIResponse(
      'How can I download reports?',
      'supplier',
      {},
      '64f1c2a1b2c3d4e5f6789014',
      {
        _id: '64f1c2a1b2c3d4e5f6789014',
        role: 'supplier',
        canExportReports: true
      }
    );

    expect(response).toContain('HOW TO USE THE WEBSITE');
    expect(response).toContain('Dashboard > Reports');
    expect(response).toContain('My Orders');
  });

  test('allows supplier report capability when supplier export permission is enabled', async () => {
    const response = await generateAIResponse(
      'Am I able to download report?',
      'supplier',
      {},
      '64f1c2a1b2c3d4e5f6789014',
      {
        _id: '64f1c2a1b2c3d4e5f6789014',
        role: 'supplier',
        canExportReports: true
      }
    );

    expect(response).toContain('Yes, you can view reports');
    expect(response).toContain('My Orders');
  });

  test('allows supplier to update own order with status-update guidance', async () => {
    const response = await generateAIResponse(
      'Am I able to update order?',
      'supplier',
      {},
      '64f1c2a1b2c3d4e5f6789014',
      {
        _id: '64f1c2a1b2c3d4e5f6789014',
        role: 'supplier'
      }
    );

    expect(response).toContain('Yes, you can edit orders');
    expect(response).toContain('Supplier Orders');
    expect(response).toContain('Status Updates');
  });

  test('allows supplier to update order status explicitly', async () => {
    const response = await generateAIResponse(
      'Can I update order status?',
      'supplier',
      {},
      '64f1c2a1b2c3d4e5f6789014',
      {
        _id: '64f1c2a1b2c3d4e5f6789014',
        role: 'supplier'
      }
    );

    expect(response).toContain('Yes, you can edit orders');
    expect(response).toContain('Order Status');
  });

  test('asks for a feature name when the how-to query is too vague', async () => {
    const response = await generateAIResponse(
      'How can I do this thing?',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('I can guide you through the website');
    expect(response).toContain('How do I add a product?');
    expect(response).toContain('How do I create an order?');
  });

  test('returns concrete low stock alerts for business owner query', async () => {
    const response = await generateAIResponse(
      'Show low stock alerts',
      'businessowner',
      {
        lowStockProducts: [
          { name: 'Alpha Mix', category: 'Snacks', totalProducts: 3, price: 1299 },
          { name: 'Beta Pack', category: 'Beverages', totalProducts: 7, price: 899 }
        ]
      },
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('LOW STOCK ALERT');
    expect(response).toContain('Alpha Mix');
    expect(response).toContain('Current stock: **3** units');
    expect(response).not.toContain('BUSINESS IMPROVEMENT SUGGESTIONS');
  });

  test('returns concrete low stock alerts for employee query', async () => {
    const response = await generateAIResponse(
      'Show low stock alerts',
      'employee',
      {
        lowStockProducts: [
          { name: 'Gamma Bar', category: 'Snacks', totalProducts: 4 }
        ]
      },
      EMPLOYEE_ID
    );

    expect(response).toContain('LOW STOCK ALERT');
    expect(response).toContain('Gamma Bar');
    expect(response).toContain('Current stock: **4** units');
  });

  test('denies product details when employee lacks product permission', async () => {
    Employee.findById.mockReturnValue({
      select: jest.fn(() => Promise.resolve({ businessowner: BUSINESS_OWNER_ID }))
    });

    const response = await generateAIResponse(
      'Show product details for Alpha Mix',
      'employee',
      {},
      EMPLOYEE_ID,
      {
        _id: EMPLOYEE_ID,
        role: 'employee',
        permissions: {
          canViewProducts: false,
          canCreateProducts: false,
          canEditProducts: false
        }
      }
    );

    expect(response).toContain('You are not accessible to that data.');
    expect(Product.find).not.toHaveBeenCalled();
  });

  test('denies warehouse details when employee lacks warehouse permission', async () => {
    const response = await generateAIResponse(
      'Show warehouse details for Central Hub',
      'employee',
      {},
      EMPLOYEE_ID,
      {
        _id: EMPLOYEE_ID,
        role: 'employee',
        permissions: {
          canViewProducts: false,
          canCreateProducts: false,
          canEditProducts: false,
          canViewWarehouses: false
        }
      }
    );

    expect(response).toBe('You are not accessible to that data.');
    expect(Warehouse.find).not.toHaveBeenCalled();
  });

  test('denies order details when employee lacks order permission', async () => {
    const response = await generateAIResponse(
      'Show order details for Rahul Sharma',
      'employee',
      {},
      EMPLOYEE_ID,
      {
        _id: EMPLOYEE_ID,
        role: 'employee',
        permissions: { canViewOrders: false }
      }
    );

    expect(response).toBe('You are not accessible to that data.');
    expect(CustomerOrders.find).not.toHaveBeenCalled();
  });

  test('returns supplier list for generic supplier details query', async () => {
    Supplier.find.mockReturnValue(makeSelectSortLimitLeanChain([
      {
        fname: 'Supplier',
        lname: '',
        email: 'supplier@test.com',
        phone: '+916234567890',
        companyName: 'Test Supplies',
        companyEmail: 'company@test.com',
        companyPhone: '+911234567890',
        address: 'Main Street',
        isActive: true
      }
    ]));

    const response = await generateAIResponse(
      'show supplier details',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('SUPPLIER DETAILS');
    expect(response).toContain('supplier@test.com');
    expect(response).toContain('Supplier');
  });

  test('returns specific supplier details by email', async () => {
    Supplier.find.mockReturnValue(makeSelectSortLimitLeanChain([
      {
        fname: 'Supplier',
        lname: '',
        email: 'supplier@test.com',
        phone: '+916234567890',
        companyName: 'Test Supplies',
        companyEmail: 'company@test.com',
        companyPhone: '+911234567890',
        address: 'Main Street',
        isActive: true
      }
    ]));

    const response = await generateAIResponse(
      'show supplier details for supplier@test.com',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('SUPPLIER DETAILS');
    expect(response).toContain('email "supplier@test.com"');
    expect(response).toContain('Supplier');
  });

  test('returns supplier orders for supplier order query', async () => {
    SupplierOrders.find.mockReturnValue(makeSelectPopulateSortLimitLeanChain([
      {
        pName: 'Product1',
        category: 'Category1',
        amount: 100000,
        ounits: 10,
        oDate: '2026-02-10T00:00:00.000Z',
        dDate: '2026-02-20T00:00:00.000Z',
        status: 'Pending',
        paymentStatus: 'Completed',
        supplier: {
          fname: 'Supplier',
          lname: '',
          companyName: 'Test Supplies'
        }
      }
    ]));

    const response = await generateAIResponse(
      'show supplier orders',
      'businessowner',
      {},
      BUSINESS_OWNER_ID
    );

    expect(response).toContain('SUPPLIER ORDERS');
    expect(response).toContain('Product1');
    expect(response).toContain('Supplier');
  });

  test('supplier query for latest orders returns supplier order list instead of clarification', async () => {
    SupplierOrders.find.mockReturnValue(makeSelectPopulateSortLimitLeanChain([
      {
        pName: 'Raw Material A',
        category: 'Category1',
        amount: 500,
        ounits: 8,
        oDate: '2026-04-01T00:00:00.000Z',
        dDate: '2026-04-04T00:00:00.000Z',
        status: 'Pending',
        paymentStatus: 'Completed',
        supplier: { fname: 'Supplier', lname: '', companyName: 'Test Supplies' }
      }
    ]));

    const response = await generateAIResponse(
      'Show my latest 5 orders',
      'supplier',
      {},
      '64f1c2a1b2c3d4e5f6789014'
    );

    expect(response).toContain('YOUR SUPPLIER ORDERS');
    expect(response).toContain('Raw Material A');
    expect(response).not.toContain('I understand you want order details');
  });

  test('supplier pending order query applies pending filter in response title', async () => {
    SupplierOrders.find.mockReturnValue(makeSelectPopulateSortLimitLeanChain([
      {
        pName: 'Raw Material B',
        category: 'Category2',
        amount: 700,
        ounits: 5,
        oDate: '2026-04-02T00:00:00.000Z',
        dDate: '2026-04-06T00:00:00.000Z',
        status: 'Pending',
        paymentStatus: 'Pending',
        supplier: { fname: 'Supplier', lname: '', companyName: 'Test Supplies' }
      }
    ]));

    const response = await generateAIResponse(
      'Show pending supply orders',
      'supplier',
      {},
      '64f1c2a1b2c3d4e5f6789014'
    );

    expect(response).toContain('YOUR PENDING SUPPLIER ORDERS');
    expect(response).toContain('Raw Material B');
  });

  test('supplier order details by product name returns matching supplier order response', async () => {
    SupplierOrders.find.mockReturnValue(makeSelectPopulateSortLimitLeanChain([
      {
        pName: 'Floor Cleaner 1L',
        category: 'Cleaning',
        amount: 450,
        ounits: 12,
        oDate: '2026-04-03T00:00:00.000Z',
        dDate: '2026-04-09T00:00:00.000Z',
        status: 'Delivered',
        paymentStatus: 'Completed',
        supplier: { fname: 'Supplier', lname: '', companyName: 'Test Supplies' }
      }
    ]));

    const response = await generateAIResponse(
      'Show order details for Floor Cleaner 1L',
      'supplier',
      {},
      '64f1c2a1b2c3d4e5f6789014'
    );

    expect(response).toContain('YOUR SUPPLIER ORDERS');
    expect(response).toContain('Floor Cleaner 1L');
  });

  describe('order status showcase with detailed points', () => {
    test('business owner order status shows orders grouped by status', async () => {
      const response = await generateAIResponse(
        'show order status',
        'businessowner',
        {
          totalOrders: 10,
          totalRevenue: 50000,
          avgOrderValue: 5000,
          orderStatusBreakdown: [
            { _id: 'Pending', count: 3 },
            { _id: 'Processing', count: 2 },
            { _id: 'Delivered', count: 5 }
          ],
          recentOrders: [
            {
              _id: 'o1',
              cName: 'Customer1',
              pName: 'Product A',
              amount: 5000,
              status: 'Pending',
              oDate: '2026-04-01T00:00:00.000Z'
            },
            {
              _id: 'o2',
              cName: 'Customer2',
              pName: 'Product B',
              amount: 4500,
              status: 'Processing',
              oDate: '2026-04-02T00:00:00.000Z'
            },
            {
              _id: 'o3',
              cName: 'Customer3',
              pName: 'Product C',
              amount: 5500,
              status: 'Delivered',
              oDate: '2026-04-03T00:00:00.000Z'
            },
            {
              _id: 'o4',
              cName: 'Customer4',
              pName: 'Product D',
              amount: 6000,
              status: 'Pending',
              oDate: '2026-04-04T00:00:00.000Z'
            }
          ]
        },
        BUSINESS_OWNER_ID
      );

      expect(response).toContain('ORDER STATUS OVERVIEW');
      expect(response).toContain('Total Orders: **10**');
      expect(response).toContain('Total Revenue: **₹50000**');
      expect(response).toContain('Average Order Value: **₹5000**');
      expect(response).toContain('Orders by Status');
      expect(response).toContain('Pending');
      expect(response).toContain('Processing');
      expect(response).toContain('Delivered');
      expect(response).toContain('Customer1');
      expect(response).toContain('Product A');
    });

    test('employee order status shows urgent and overdue orders prominently', async () => {
      const response = await generateAIResponse(
        'show my order status',
        'employee',
        {
          totalOrders: 8,
          pendingTasks: 2,
          completedTasks: 6,
          assignedOrdersList: [
            {
              _id: 'e1',
              cName: 'Customer1',
              pName: 'Product X',
              status: 'Pending',
              oDate: '2026-04-01T00:00:00.000Z'
            },
            {
              _id: 'e2',
              cName: 'Customer2',
              pName: 'Product Y',
              status: 'Delivered',
              oDate: '2026-04-02T00:00:00.000Z'
            }
          ],
          overdueOrders: [
            {
              _id: 'o1',
              cName: 'Customer5',
              pName: 'Product Z',
              dDate: '2026-03-28T00:00:00.000Z'
            }
          ],
          urgentOrders: [
            {
              _id: 'u1',
              cName: 'Customer6',
              pName: 'Product W',
              dDate: '2026-04-05T00:00:00.000Z'
            }
          ]
        },
        EMPLOYEE_ID
      );

      expect(response).toContain('YOUR ORDERS & TASKS');
      expect(response).toContain('Total Orders: **8**');
      expect(response).toContain('Pending Tasks: **2**');
      expect(response).toContain('Completed Tasks: **6**');
      expect(response).toContain('OVERDUE ORDERS');
      expect(response).toContain('URGENT ORDERS');
      expect(response).toContain('Customer5');
      expect(response).toContain('Customer6');
    });

    test('supplier order status shows orders grouped by status', async () => {
      const response = await generateAIResponse(
        'show my supply orders status',
        'supplier',
        {
          totalOrders: 5,
          pendingOrders: 2,
          deliveredOrders: 2,
          cancelledOrders: 1,
          totalOrderValue: 25000,
          recentSupplierOrders: [
            {
              _id: 's1',
              pName: 'Raw Material A',
              ounits: 10,
              amount: 1000,
              status: 'Pending',
              oDate: '2026-04-01T00:00:00.000Z'
            },
            {
              _id: 's2',
              pName: 'Raw Material B',
              ounits: 5,
              amount: 2000,
              status: 'Delivered',
              oDate: '2026-04-02T00:00:00.000Z'
            },
            {
              _id: 's3',
              pName: 'Raw Material C',
              ounits: 15,
              amount: 500,
              status: 'Pending',
              oDate: '2026-04-03T00:00:00.000Z'
            }
          ]
        },
        '64f1c2a1b2c3d4e5f6789014'
      );

      expect(response).toContain('YOUR SUPPLY ORDERS');
      expect(response).toContain('Total Orders: **5**');
      expect(response).toContain('Pending: **2**');
      expect(response).toContain('Delivered: **2**');
      expect(response).toContain('Cancelled: **1**');
      expect(response).toContain('Total Value: **₹25000**');
      expect(response).toContain('Raw Material A');
      expect(response).toContain('Raw Material B');
      expect(response).toContain('Qty: 10');
      expect(response).toContain('Qty: 5');
    });

    test('order status response handles empty orders gracefully', async () => {
      const emptyContext = {
        totalOrders: 0,
        pendingTasks: 0,
        completedTasks: 0,
        assignedOrdersList: []
      };

      const response = await generateAIResponse(
        'show order status',
        'employee',
        emptyContext,
        EMPLOYEE_ID
      );

      expect(response).toContain('No orders assigned to you yet');
    });

    test('order status breakdown includes all status types', async () => {
      const contextWithMultipleStatuses = {
        totalOrders: 15,
        totalRevenue: 50000,
        avgOrderValue: 3333,
        orderStatusBreakdown: [
          { _id: 'Pending', count: 5 },
          { _id: 'Processing', count: 3 },
          { _id: 'Shipped', count: 2 },
          { _id: 'Delivered', count: 4 },
          { _id: 'Cancelled', count: 1 }
        ],
        recentOrders: [
          { cName: 'C1', pName: 'P1', amount: 1000, status: 'Pending', oDate: '2026-04-01' },
          { cName: 'C2', pName: 'P2', amount: 1500, status: 'Pending', oDate: '2026-04-02' },
          { cName: 'C3', pName: 'P3', amount: 2000, status: 'Processing', oDate: '2026-04-03' },
          { cName: 'C4', pName: 'P4', amount: 2500, status: 'Processing', oDate: '2026-04-04' },
          { cName: 'C5', pName: 'P5', amount: 3000, status: 'Shipped', oDate: '2026-04-05' },
          { cName: 'C6', pName: 'P6', amount: 3500, status: 'Delivered', oDate: '2026-04-06' },
          { cName: 'C7', pName: 'P7', amount: 4000, status: 'Delivered', oDate: '2026-04-07' },
          { cName: 'C8', pName: 'P8', amount: 4500, status: 'Cancelled', oDate: '2026-04-08' }
        ]
      };

      const response = await generateAIResponse(
        'order status',
        'businessowner',
        contextWithMultipleStatuses,
        BUSINESS_OWNER_ID
      );

      expect(response).toContain('Pending');
      expect(response).toContain('Processing');
      expect(response).toContain('Shipped');
      expect(response).toContain('Delivered');
      expect(response).toContain('Cancelled');
      expect(response).toContain('**Pending**: 5');
      expect(response).toContain('**Processing**: 3');
      expect(response).toContain('**Shipped**: 2');
      expect(response).toContain('**Delivered**: 4');
      expect(response).toContain('**Cancelled**: 1');
    });
  });

  describe('order deadline showcase with overdue and not overdue', () => {
    test('business owner deadline view shows overdue vs not overdue orders', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const response = await generateAIResponse(
        'show orders by deadline',
        'businessowner',
        {
          totalOrders: 5,
          recentOrders: [
            {
              _id: 'o1',
              cName: 'Customer1',
              pName: 'ProductA',
              amount: 1000,
              status: 'Pending',
              oDate: '2026-04-01',
              dDate: yesterday // Overdue
            },
            {
              _id: 'o2',
              cName: 'Customer2',
              pName: 'ProductB',
              amount: 2000,
              status: 'Processing',
              oDate: '2026-04-02',
              dDate: tomorrow // Due soon
            },
            {
              _id: 'o3',
              cName: 'Customer3',
              pName: 'ProductC',
              amount: 1500,
              status: 'Shipped',
              oDate: '2026-04-03',
              dDate: nextWeek // On track
            },
            {
              _id: 'o4',
              cName: 'Customer4',
              pName: 'ProductD',
              amount: 2500,
              status: 'Pending',
              oDate: '2026-04-04'
              // No deadline
            },
            {
              _id: 'o5',
              cName: 'Customer5',
              pName: 'ProductE',
              amount: 3000,
              status: 'Delivered',
              oDate: '2026-04-05',
              dDate: yesterday // Overdue (but delivered)
            }
          ]
        },
        BUSINESS_OWNER_ID
      );

      expect(response).toContain('ORDERS BY DEADLINE');
      expect(response).toContain('Deadline Summary');
      expect(response).toContain('Overdue');
      expect(response).toContain('Due Soon');
      expect(response).toContain('On Track');
      expect(response).toContain('No Deadline');
      expect(response).toContain('Customer1');
      expect(response).toContain('Customer2');
    });

    test('employee deadline view highlights overdue orders with action required', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const response = await generateAIResponse(
        'show deadlines',
        'employee',
        {
          totalOrders: 3,
          assignedOrdersList: [
            {
              _id: 'e1',
              cName: 'Customer1',
              pName: 'ProductX',
              status: 'Pending',
              oDate: '2026-04-01',
              dDate: threeDaysAgo
            },
            {
              _id: 'e2',
              cName: 'Customer2',
              pName: 'ProductY',
              status: 'Processing',
              oDate: '2026-04-02',
              dDate: tomorrow
            }
          ]
        },
        EMPLOYEE_ID
      );

      expect(response).toContain('YOUR ORDERS BY DEADLINE');
      expect(response).toContain('Deadline Summary');
      expect(response).toContain('ACTION REQUIRED');
      expect(response).toContain('overdue order');
      expect(response).toContain('Overdue');
      expect(response).toContain('Customer1');
    });

    test('supplier deadline view groups orders by delivery timeline', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const inTenDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      const response = await generateAIResponse(
        'show supply order deadlines',
        'supplier',
        {
          totalOrders: 4,
          recentSupplierOrders: [
            {
              _id: 's1',
              pName: 'RawMat1',
              ounits: 10,
              amount: 500,
              status: 'Pending',
              oDate: '2026-03-30',
              dDate: twoDaysAgo
            },
            {
              _id: 's2',
              pName: 'RawMat2',
              ounits: 20,
              amount: 1000,
              status: 'Pending',
              oDate: '2026-03-31',
              dDate: inTwoDays
            },
            {
              _id: 's3',
              pName: 'RawMat3',
              ounits: 15,
              amount: 750,
              status: 'Processing',
              oDate: '2026-04-01',
              dDate: inTenDays
            }
          ]
        },
        '64f1c2a1b2c3d4e5f6789014'
      );

      expect(response).toContain('YOUR SUPPLY ORDERS BY DEADLINE');
      expect(response).toContain('Deadline Summary');
      expect(response).toContain('Overdue Deliveries');
      expect(response).toContain('PRIORITY');
      expect(response).toContain('RawMat1');
      expect(response).toContain('RawMat2');
    });

    test('deadline view handles orders with no deadline', async () => {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const response = await generateAIResponse(
        'show order deadlines',
        'businessowner',
        {
          totalOrders: 3,
          recentOrders: [
            {
              _id: 'o1',
              cName: 'Customer1',
              pName: 'ProductA',
              amount: 1000,
              status: 'Pending',
              oDate: '2026-04-01'
              // No deadline
            },
            {
              _id: 'o2',
              cName: 'Customer2',
              pName: 'ProductB',
              amount: 2000,
              status: 'Pending',
              oDate: '2026-04-02'
              // No deadline
            },
            {
              _id: 'o3',
              cName: 'Customer3',
              pName: 'ProductC',
              amount: 1500,
              status: 'Shipped',
              oDate: '2026-04-03',
              dDate: nextWeek
            }
          ]
        },
        BUSINESS_OWNER_ID
      );

      expect(response).toContain('ORDERS BY DEADLINE');
      expect(response).toContain('NO DEADLINE');
      expect(response).toContain('On Track');
      expect(response).toContain('Overdue: **0**');
    });

    test('deadline query triggers deadline response instead of status response', async () => {
      const response = await generateAIResponse(
        'show overdue orders',
        'businessowner',
        {
          totalOrders: 5,
          totalRevenue: 25000,
          orderStatusBreakdown: [
            { _id: 'Pending', count: 2 },
            { _id: 'Delivered', count: 3 }
          ],
          recentOrders: [
            {
              _id: 'o1',
              cName: 'C1',
              pName: 'P1',
              amount: 1000,
              status: 'Pending',
              dDate: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000)
            }
          ]
        },
        BUSINESS_OWNER_ID
      );

      // Should show deadline view, not status view
      expect(response).toContain('ORDERS BY DEADLINE');
      expect(response).toContain('Overdue');
      expect(response).not.toContain('ORDER STATUS OVERVIEW');
    });

    test('deadline statistics are calculated correctly', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const soonDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      const laterDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      const response = await generateAIResponse(
        'show my overdue orders',
        'employee',
        {
          totalOrders: 4,
          assignedOrdersList: [
            {
              _id: 'e1',
              cName: 'C1',
              pName: 'P1',
              status: 'Pending',
              dDate: pastDate
            },
            {
              _id: 'e2',
              cName: 'C2',
              pName: 'P2',
              status: 'Pending',
              dDate: soonDate
            },
            {
              _id: 'e3',
              cName: 'C3',
              pName: 'P3',
              status: 'Processing',
              dDate: laterDate
            },
            {
              _id: 'e4',
              cName: 'C4',
              pName: 'P4',
              status: 'Pending'
            }
          ]
        },
        EMPLOYEE_ID
      );

      expect(response).toContain('Overdue: **1**');
      expect(response).toContain('Due Soon (≤3 days): **1**');
      expect(response).toContain('On Track: **1**');
    });

    test('relative deadline query for tomorrow returns matching orders', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const later = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

      CustomerOrders.find.mockReturnValue(makeSelectSortLimitLeanChain([
        {
          cName: 'Customer Tomorrow',
          pName: 'Product Tomorrow',
          amount: 1200,
          status: 'Pending',
          oDate: now,
          dDate: tomorrow
        }
      ]));

      const response = await generateAIResponse(
        'show orders due tomorrow',
        'businessowner',
        {},
        BUSINESS_OWNER_ID
      );

      expect(response).toContain('ORDERS DUE TOMORROW');
      expect(response).toContain('Customer Tomorrow');
      expect(response).not.toContain('Product Later');
      expect(CustomerOrders.find).toHaveBeenCalled();
    });

    test('deadline range query returns orders within the requested window', async () => {
      CustomerOrders.find.mockReturnValue(makeSelectSortLimitLeanChain([
        {
          cName: 'Customer Range 1',
          pName: 'Product Range 1',
          amount: 1500,
          status: 'Processing',
          oDate: '2026-04-01T00:00:00.000Z',
          dDate: '2026-04-05T00:00:00.000Z'
        },
        {
          cName: 'Customer Range 2',
          pName: 'Product Range 2',
          amount: 2200,
          status: 'Pending',
          oDate: '2026-04-02T00:00:00.000Z',
          dDate: '2026-04-06T00:00:00.000Z'
        }
      ]));

      const response = await generateAIResponse(
        'show orders due between 1/4/2026 and 7/4/2026',
        'businessowner',
        {},
        BUSINESS_OWNER_ID
      );

      expect(response).toContain('ORDERS DUE RANGE');
      expect(response).toContain('Customer Range 1');
      expect(response).toContain('Customer Range 2');
      expect(CustomerOrders.find).toHaveBeenCalled();
    });
  });

  describe('role-wise chatbot query matrix validation', () => {
    const SUPPLIER_ID = '64f1c2a1b2c3d4e5f6789014';

    const ownerUser = {
      _id: BUSINESS_OWNER_ID,
      role: 'businessowner'
    };

    const employeeLimitedUser = {
      _id: EMPLOYEE_ID,
      role: 'employee',
      permissions: {
        canViewOrders: true,
        canViewProducts: true,
        canCreateProducts: true,
        canEditProducts: true,
        canDeleteProducts: false,
        canApproveOrders: false,
        canViewEmployees: false,
        canManageEmployees: false,
        canExportReports: false,
        canViewAnalytics: false,
        canViewDashboard: true,
        canDownloadEmployeeReport: false,
        canDownloadProductReport: false,
        canDownloadOrderReport: false,
        canDownloadSupplierOrderReport: false,
        canDownloadSupplierReport: false,
        canDownloadSalaryReport: false
      }
    };

    const supplierLimitedUser = {
      _id: SUPPLIER_ID,
      role: 'supplier',
      canExportReports: false
    };

    const businessContext = {
      products: 12,
      totalOrders: 18,
      pendingOrders: 4,
      completedOrders: 10,
      warehouses: 2,
      suppliers: 3,
      employees: 5,
      totalRevenue: 120000,
      avgOrderValue: 6666,
      lowStockProducts: [
        { name: 'Alpha Mix', category: 'Snacks', totalProducts: 3, price: 1299 }
      ],
      employeesList: [
        {
          fname: 'Manager',
          lname: 'One',
          email: 'manager1@test.com',
          role: 'manager',
          salary: { baseSalary: 10000, currency: 'INR', paymentFrequency: 'monthly' }
        }
      ],
      recentOrders: [
        {
          cName: 'Customer1',
          pName: 'Alpha Mix',
          amount: 3000,
          status: 'Pending',
          oDate: '2026-04-01T00:00:00.000Z'
        }
      ],
      orderStatusBreakdown: [
        { _id: 'Pending', count: 4 },
        { _id: 'Processing', count: 4 },
        { _id: 'Delivered', count: 10 }
      ],
      totalSalaryPaid: 50000,
      salaryPaymentCount: 6
    };

    const employeeContext = {
      employeeName: 'Employee Two',
      totalOrders: 8,
      pendingTasks: 2,
      completedTasks: 6,
      lowStockProducts: [{ name: 'Beta Pack', totalProducts: 4, category: 'Beverages' }],
      mySalaryPayments: [{ amount: 8000, paymentDate: '2026-03-31T00:00:00.000Z', status: 'completed' }],
      assignedOrdersList: [
        { cName: 'Customer2', pName: 'Beta Pack', status: 'Pending', amount: 2000, oDate: '2026-04-02T00:00:00.000Z' }
      ]
    };

    const supplierContext = {
      totalOrders: 5,
      pendingOrders: 2,
      deliveredOrders: 2,
      cancelledOrders: 1,
      totalOrderValue: 25000,
      recentSupplierOrders: [
        { pName: 'Raw Material A', ounits: 10, amount: 500, status: 'Pending', oDate: '2026-04-03T00:00:00.000Z' }
      ]
    };

    test('business owner queries return useful guidance, analytics, and capability responses', async () => {
      const ownerQueries = [
        {
          query: 'How do I create an order?',
          expected: ['HOW TO USE THE WEBSITE', 'Dashboard > Orders > Add Order']
        },
        {
          query: 'How do I manage permissions for one employee?',
          expected: ['HOW TO USE THE WEBSITE', 'Permissions', 'Individual Permissions']
        },
        {
          query: 'Can I delete a warehouse?',
          expected: ['Yes, you can delete warehouses', 'Open Warehouses']
        },
        {
          query: 'Can I edit employee permissions?',
          expected: ['Yes, you can edit permissions', 'Role-Based Permissions']
        },
        {
          query: 'Give business improvement suggestions based on my current data.',
          expected: ['BUSINESS IMPROVEMENT SUGGESTIONS']
        },
        {
          query: 'How can I increase sales this month with targeted strategies?',
          expected: ['BUSINESS IMPROVEMENT SUGGESTIONS', 'Recommended Actions']
        }
      ];

      for (const item of ownerQueries) {
        const response = await generateAIResponse(
          item.query,
          'businessowner',
          businessContext,
          BUSINESS_OWNER_ID,
          ownerUser
        );

        item.expected.forEach((needle) => {
          expect(response).toContain(needle);
        });
      }
    });

    test('employee queries enforce permissions and still support allowed guidance', async () => {
      const employeeQueries = [
        {
          query: 'How do I check order status?',
          expected: ['HOW TO USE THE WEBSITE', 'Dashboard > Orders']
        },
        {
          query: 'Can I create products?',
          expected: ['Yes, you can create products']
        },
        {
          query: 'Can I delete products?',
          expected: ['Not with your current access', 'canDeleteProducts']
        },
        {
          query: 'Can I approve orders?',
          expected: ['Not with your current access', 'canApproveOrders']
        },
        {
          query: 'Can I view employees list?',
          expected: ['Not with your current access', 'canViewEmployees']
        },
        {
          query: 'Can I export reports?',
          expected: ['Not with your current access', 'canExportReports']
        },
        {
          query: 'Show full business revenue summary.',
          expected: ['You are not accessible to that data.']
        },
        {
          query: 'Can I manage permissions?',
          expected: ['Not with your current access', 'canManageEmployees']
        }
      ];

      for (const item of employeeQueries) {
        const response = await generateAIResponse(
          item.query,
          'employee',
          employeeContext,
          EMPLOYEE_ID,
          employeeLimitedUser
        );

        item.expected.forEach((needle) => {
          expect(response).toContain(needle);
        });
      }
    });

    test('supplier queries allow own-order flows and deny cross-role sensitive data', async () => {
      const supplierQueries = [
        {
          query: 'Show my pending supplier orders.',
          expected: ['YOUR PENDING SUPPLIER ORDERS']
        },
        {
          query: 'How do I download my order report?',
          expected: ['HOW TO USE THE WEBSITE', 'My Orders', 'Excel or PDF']
        },
        {
          query: 'Can I download reports?',
          expected: ['Not with your current access', 'canExportReports']
        },
        {
          query: 'Can I edit my order status?',
          expected: ['Yes, you can edit orders', 'Supplier Orders', 'Order Status']
        },
        {
          query: 'Show all employees and their salaries.',
          expected: ['You are not accessible to that data.']
        },
        {
          query: 'Show all warehouse details.',
          expected: ['You are not accessible to that data.']
        },
        {
          query: 'Show business owner revenue analytics.',
          expected: ['Your Total Order Value', 'Pending: 2']
        },
        {
          query: 'Guide me to manage employee permissions.',
          expected: ['You are not accessible to that data.']
        }
      ];

      for (const item of supplierQueries) {
        const response = await generateAIResponse(
          item.query,
          'supplier',
          supplierContext,
          SUPPLIER_ID,
          supplierLimitedUser
        );

        item.expected.forEach((needle) => {
          expect(response).toContain(needle);
        });
      }
    });
  });
});
