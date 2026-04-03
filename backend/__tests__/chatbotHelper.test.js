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
  find: jest.fn()
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
  aggregate: jest.fn()
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
    limit: jest.fn(() => Promise.resolve(value))
  }))
});

const makeSelectLeanChain = (value) => ({
  select: jest.fn(() => ({
    lean: jest.fn(() => Promise.resolve(value))
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
});