const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectToMongo = require('../db');

const BusinessOwner = require('../models/BusinessOwner');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const Category = require('../models/Category');
const Product = require('../models/Products');
const CustomerOrders = require('../models/CustomerOrders');
const SupplierOrders = require('../models/SupplierOrders');

const SEED_PREFIX = '[seed-sample-data]';
const SEED_DATA_TAG = `${SEED_PREFIX} generated`;

const getArgValue = (argName) => {
  const arg = process.argv.find((item) => item.startsWith(`${argName}=`));
  if (!arg) return null;
  return arg.slice(argName.length + 1).trim();
};

const TARGET_COUNTS = {
  warehouses: 3,
  employees: 3,
  suppliers: 3,
  categories: 8,
  products: 15,
  customerOrders: 8,
  supplierOrders: 6
};

const TARGET_OWNER_EMAIL = getArgValue('--ownerEmail') || 'owner@test.com';
const TARGET_OWNER_PASSWORD = getArgValue('--ownerPassword') || 'Owner@123';

const SAMPLE_CREDENTIALS = {
  businessOwner: {
    email: TARGET_OWNER_EMAIL,
    password: TARGET_OWNER_PASSWORD
  },
  manager: {
    email: 'manager1@test.com',
    password: 'Manager@123'
  },
  supplier: {
    email: 'supplier1@test.com',
    password: 'Supplier@123'
  }
};

const hashPassword = async (plainText) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
};

const upsertBusinessOwner = async () => {
  const existing = await BusinessOwner.findOne({ email: SAMPLE_CREDENTIALS.businessOwner.email });
  if (existing) {
    return existing;
  }

  const password = await hashPassword(SAMPLE_CREDENTIALS.businessOwner.password);

  return BusinessOwner.findOneAndUpdate(
    { email: SAMPLE_CREDENTIALS.businessOwner.email },
    {
      $set: {
        fname: 'Demo',
        lname: 'Owner',
        phone: 9876543210,
        address: '101 Commerce Street',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        role: 'businessowner',
        active: true,
        password
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertWarehouse = async (businessowner, seed) => {
  return Warehouse.findOneAndUpdate(
    { businessowner: businessowner._id, wEmail: seed.wEmail },
    {
      $set: {
        businessowner: businessowner._id,
        wName: seed.wName,
        wManager: seed.wManager,
        wAddress: seed.wAddress,
        wContact: seed.wContact,
        wEmail: seed.wEmail,
        city: seed.city,
        state: seed.state,
        country: seed.country
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertEmployee = async (businessowner, warehouse) => {
  const existing = await Employee.findOne({ email: SAMPLE_CREDENTIALS.manager.email });
  const password = existing
    ? existing.password
    : await hashPassword(SAMPLE_CREDENTIALS.manager.password);

  return Employee.findOneAndUpdate(
    { email: SAMPLE_CREDENTIALS.manager.email },
    {
      $set: {
        businessowner: businessowner._id,
        warehouse: warehouse._id,
        fname: 'Maya',
        lname: 'Manager',
        role: 'manager',
        phone: '+919876543210',
        address: '12 Lake View',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        department: 'Operations',
        isActive: true,
        password,
        hasCustomPermissions: true,
        permissions: {
          canViewProducts: true,
          canCreateProducts: true,
          canEditProducts: true,
          canDeleteProducts: true,
          canViewCategories: true,
          canCreateCategory: true,
          canEditCategory: true,
          canDeleteCategory: false,
          canViewWarehouses: true,
          canCreateWarehouse: true,
          canEditWarehouse: true,
          canDeleteWarehouse: false,
          canViewOrders: true,
          canCreateOrders: true,
          canEditOrders: true,
          canDeleteOrders: false,
          canApproveOrders: true,
          canViewEmployees: true,
          canManageEmployees: true,
          canEditOthersWork: true,
          canViewAnalytics: true,
          canExportReports: true,
          canDownloadEmployeeReport: true,
          canDownloadProductReport: true,
          canDownloadOrderReport: true,
          canDownloadSupplierOrderReport: true,
          canDownloadSupplierReport: true,
          canDownloadSalaryReport: true,
          canSendNotifications: true,
          canViewNotifications: true,
          canViewMessages: true,
          canSendMessages: true,
          canDeleteMessages: true,
          canMessageSuppliers: true,
          canMessageColleagues: true,
          canViewDashboard: true
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertSupplier = async (businessowner) => {
  const existing = await Supplier.findOne({ email: SAMPLE_CREDENTIALS.supplier.email });
  const password = existing
    ? existing.password
    : await hashPassword(SAMPLE_CREDENTIALS.supplier.password);

  return Supplier.findOneAndUpdate(
    { email: SAMPLE_CREDENTIALS.supplier.email },
    {
      $set: {
        businessowner: businessowner._id,
        fname: 'Ravi',
        lname: 'Supplies',
        companyName: 'Ravi Wholesale Pvt Ltd',
        companyEmail: 'contact@test.com',
        companyPhone: '+919812345678',
        companyAddress: '7 Industrial Area, Pune',
        email: SAMPLE_CREDENTIALS.supplier.email,
        phone: '+919812345678',
        role: 'supplier',
        canExportReports: true,
        canMessage: true,
        isActive: true,
        password
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertAdditionalSupplier = async (businessowner, index) => {
  const email = `supplier${index + 2}@test.com`;
  const existing = await Supplier.findOne({ email });
  const password = existing
    ? existing.password
    : await hashPassword(`Supplier${index + 2}@123`);

  return Supplier.findOneAndUpdate(
    { email },
    {
      $set: {
        businessowner: businessowner._id,
        fname: `Supplier${index + 2}`,
        lname: 'Demo',
        companyName: `Demo Supplies ${index + 2}`,
        companyEmail: `contact${index + 2}@test.com`,
        companyPhone: `+91981234${String(7000 + index).padStart(4, '0')}`,
        companyAddress: `${index + 2} Supplier Lane, Pune`,
        phone: `+91981234${String(7000 + index).padStart(4, '0')}`,
        role: 'supplier',
        canExportReports: true,
        canMessage: true,
        isActive: true,
        password
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertCategory = async (businessowner, seed) => {
  return Category.findOneAndUpdate(
    { businessowner: businessowner._id, cName: seed.cName },
    {
      $set: {
        businessowner: businessowner._id,
        cName: seed.cName,
        cDesc: seed.cDesc
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertAdditionalEmployee = async (businessowner, warehouse, index) => {
  const email = `staff${index + 2}@test.com`;
  const existing = await Employee.findOne({ email });
  const password = existing
    ? existing.password
    : await hashPassword(`Staff${index + 2}@123`);

  const roleByIndex = ['supervisor', 'employee', 'employee'];
  const role = roleByIndex[index % roleByIndex.length];

  return Employee.findOneAndUpdate(
    { email },
    {
      $set: {
        businessowner: businessowner._id,
        warehouse: warehouse._id,
        fname: `Staff${index + 2}`,
        lname: 'Demo',
        role,
        phone: `+9198765${String(80000 + index).padStart(5, '0')}`,
        address: `${index + 22} Warehouse Road`,
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        department: 'Operations',
        isActive: true,
        password,
        hasCustomPermissions: false
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertProduct = async (businessowner, employee, category, warehouses, seed) => {
  return Product.findOneAndUpdate(
    { businessowner: businessowner._id, name: seed.name, brand: seed.brand },
    {
      $set: {
        businessowner: businessowner._id,
        employee: employee._id,
        name: seed.name,
        category: String(category._id),
        price: seed.price,
        totalProducts: seed.totalProducts,
        warehouse: warehouses.map((w) => String(w._id)),
        brand: seed.brand,
        mDate: seed.mDate,
        eDate: seed.eDate,
        desc: seed.desc
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertCustomerOrder = async (businessowner, employee, warehouse, products, seed = {}) => {
  const pickedProducts = seed.productIndexes
    ? seed.productIndexes.map((index) => products[index % products.length]).filter(Boolean)
    : products.slice(0, 2);

  const orderedProducts = pickedProducts.map((item) => ({
    product: item._id,
    productName: item.name,
    category: item.category,
    quantity: seed.quantity || 2,
    unitPrice: item.price,
    totalPrice: item.price * (seed.quantity || 2)
  }));

  const amount = orderedProducts.reduce((sum, item) => sum + item.totalPrice, 0);

  const payload = {
    businessowner: businessowner._id,
    employee: employee._id,
    warehouse: warehouse._id,
    cName: seed.cName || 'Aarav Retail',
    cEmail: seed.cEmail || 'orders@test.com',
    cPhone: seed.cPhone || 9898989898,
    cAddress: seed.cAddress || 'Shop 12, Market Road',
    products: orderedProducts,
    pName: orderedProducts[0]?.productName || 'Sample Product',
    category: orderedProducts[0]?.category || '',
    ounits: seed.quantity || 2,
    amount,
    oDate: seed.oDate || new Date('2026-04-01T10:00:00.000Z'),
    dDate: seed.dDate || new Date('2026-04-08T10:00:00.000Z'),
    status: seed.status || 'Confirmed',
    pAvail: seed.pAvail || 'Yes',
    dStatus: seed.dStatus || 'In Transit',
    desc: seed.desc || `${SEED_PREFIX} customer-order`
  };

  return CustomerOrders.findOneAndUpdate(
    {
      businessowner: businessowner._id,
      cEmail: payload.cEmail,
      desc: payload.desc
    },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertSupplierOrder = async (businessowner, supplier, employee, warehouse, product) => {
  const payload = {
    businessowner: businessowner._id,
    supplier: supplier._id,
    employee: employee._id,
    warehouse: warehouse._id,
    pName: product.name,
    category: product.category,
    amount: product.price * 5,
    ounits: 5,
    oDate: new Date('2026-04-02T10:00:00.000Z'),
    dDate: new Date('2026-04-10T10:00:00.000Z'),
    status: 'Pending',
    paymentStatus: 'Pending',
    pAvail: 'Expected',
    dStatus: 'Processing',
    desc: `${SEED_PREFIX} supplier-order`
  };

  return SupplierOrders.findOneAndUpdate(
    {
      businessowner: businessowner._id,
      supplier: supplier._id,
      pName: payload.pName,
      desc: payload.desc
    },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertSupplierOrderSeed = async (businessowner, supplier, employee, warehouse, product, seed = {}) => {
  const payload = {
    businessowner: businessowner._id,
    supplier: supplier._id,
    employee: employee._id,
    warehouse: warehouse._id,
    pName: product.name,
    category: product.category,
    amount: product.price * (seed.ounits || 4),
    ounits: seed.ounits || 4,
    oDate: seed.oDate || new Date('2026-04-02T10:00:00.000Z'),
    dDate: seed.dDate || new Date('2026-04-10T10:00:00.000Z'),
    status: seed.status || 'Pending',
    paymentStatus: seed.paymentStatus || 'Pending',
    pAvail: seed.pAvail || 'Expected',
    dStatus: seed.dStatus || 'Processing',
    desc: seed.desc || `${SEED_PREFIX} supplier-order`
  };

  return SupplierOrders.findOneAndUpdate(
    {
      businessowner: businessowner._id,
      supplier: supplier._id,
      pName: payload.pName,
      desc: payload.desc
    },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const categorySeeds = [
  { cName: 'Beverages', cDesc: 'Packaged drinks and juices' },
  { cName: 'Snacks', cDesc: 'Ready-to-eat packaged snacks' },
  { cName: 'Cleaning', cDesc: 'Cleaning and hygiene products' },
  { cName: 'Personal Care', cDesc: 'Personal hygiene products' },
  { cName: 'Stationery', cDesc: 'Office and school stationery' },
  { cName: 'Dairy', cDesc: 'Milk, cheese, and dairy items' },
  { cName: 'Bakery', cDesc: 'Bread and bakery products' },
  { cName: 'Frozen Foods', cDesc: 'Frozen packaged foods' }
];

const seed = async () => {
  await connectToMongo();

  const businessowner = await upsertBusinessOwner();

  const [warehouseMain, warehouseSecondary] = await Promise.all([
    upsertWarehouse(businessowner, {
      wName: 'Central Warehouse',
      wManager: 'Maya Manager',
      wAddress: 'Plot 21, MIDC Industrial Zone',
      wContact: '+919812341111',
      wEmail: 'warehouse1@test.com',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India'
    }),
    upsertWarehouse(businessowner, {
      wName: 'West Zone Warehouse',
      wManager: 'Anil Supervisor',
      wAddress: 'Near Ring Road, Warehouse Block B',
      wContact: '+919812342222',
      wEmail: 'warehouse2@test.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India'
    })
  ]);

  const extraWarehouses = [];
  if (TARGET_COUNTS.warehouses > 2) {
    for (let i = 0; i < TARGET_COUNTS.warehouses - 2; i++) {
      // eslint-disable-next-line no-await-in-loop
      const extraWarehouse = await upsertWarehouse(businessowner, {
        wName: `North Hub ${i + 1}`,
        wManager: `Manager ${i + 1}`,
        wAddress: `Sector ${i + 11}, Distribution Park`,
        wContact: `+91981236${String(3000 + i).padStart(4, '0')}`,
        wEmail: `warehouse${i + 3}@test.com`,
        city: 'Nashik',
        state: 'Maharashtra',
        country: 'India'
      });
      extraWarehouses.push(extraWarehouse);
    }
  }

  const allWarehouses = [warehouseMain, warehouseSecondary, ...extraWarehouses];

  const employee = await upsertEmployee(businessowner, warehouseMain);
  const additionalEmployees = [];
  for (let i = 0; i < TARGET_COUNTS.employees - 1; i++) {
    const warehouse = allWarehouses[i % allWarehouses.length];
    // eslint-disable-next-line no-await-in-loop
    const staff = await upsertAdditionalEmployee(businessowner, warehouse, i);
    additionalEmployees.push(staff);
  }
  const allEmployees = [employee, ...additionalEmployees];

  const supplier = await upsertSupplier(businessowner);
  const additionalSuppliers = [];
  for (let i = 0; i < TARGET_COUNTS.suppliers - 1; i++) {
    // eslint-disable-next-line no-await-in-loop
    const extraSupplier = await upsertAdditionalSupplier(businessowner, i);
    additionalSuppliers.push(extraSupplier);
  }
  const allSuppliers = [supplier, ...additionalSuppliers];

  const categories = await Promise.all(
    categorySeeds
      .slice(0, TARGET_COUNTS.categories)
      .map((seed) => upsertCategory(businessowner, seed))
  );

  const products = [];
  const productLabels = [
    'Orange Spark 500ml', 'Classic Salt Chips', 'Floor Cleaner 1L', 'Mint Toothpaste', 'Notebook A5',
    'Protein Milk 250ml', 'Whole Wheat Bread', 'Frozen Peas 500g', 'Apple Juice 1L', 'Masala Crackers',
    'Hand Wash 250ml', 'Gel Pen Pack', 'Greek Yogurt Cup', 'Brown Bread Loaf', 'Frozen Corn 500g'
  ];

  for (let i = 0; i < TARGET_COUNTS.products; i++) {
    const category = categories[i % categories.length];
    const employeeForProduct = allEmployees[i % allEmployees.length];
    const productWarehouses = [allWarehouses[i % allWarehouses.length]];
    if (i % 2 === 0) {
      productWarehouses.push(allWarehouses[(i + 1) % allWarehouses.length]);
    }

    const seed = {
      name: productLabels[i] || `Inventory Item ${i + 1}`,
      brand: `Brand${(i % 5) + 1}`,
      price: 25 + (i * 7),
      totalProducts: 80 + (i * 12),
      mDate: new Date(`2026-0${(i % 6) + 1}-10T00:00:00.000Z`),
      eDate: new Date(`2027-0${(i % 6) + 1}-15T00:00:00.000Z`),
      desc: `${SEED_DATA_TAG} product-${i + 1}`
    };

    // eslint-disable-next-line no-await-in-loop
    const createdProduct = await upsertProduct(businessowner, employeeForProduct, category, productWarehouses, seed);
    products.push(createdProduct);
  }

  for (let i = 0; i < TARGET_COUNTS.customerOrders; i++) {
    const employeeForOrder = allEmployees[i % allEmployees.length];
    const warehouse = allWarehouses[i % allWarehouses.length];
    const quantity = 1 + (i % 4);

    // eslint-disable-next-line no-await-in-loop
    await upsertCustomerOrder(businessowner, employeeForOrder, warehouse, products, {
      cName: `Retail Customer ${i + 1}`,
      cEmail: `retail${i + 1}@test.com`,
      cPhone: Number(`98989${String(10000 + i).padStart(5, '0')}`),
      cAddress: `Shop ${i + 1}, Market Street`,
      quantity,
      productIndexes: [i % products.length, (i + 3) % products.length],
      oDate: new Date(2026, 2, (i % 20) + 1),
      dDate: new Date(2026, 2, (i % 20) + 4),
      status: i % 3 === 0 ? 'Pending' : 'Confirmed',
      pAvail: i % 3 === 0 ? 'No' : 'Yes',
      dStatus: i % 2 === 0 ? 'Processing' : 'In Transit',
      desc: `${SEED_DATA_TAG} customer-order-${i + 1}`
    });
  }

  for (let i = 0; i < TARGET_COUNTS.supplierOrders; i++) {
    const supplierForOrder = allSuppliers[i % allSuppliers.length];
    const employeeForOrder = allEmployees[i % allEmployees.length];
    const warehouse = allWarehouses[(i + 1) % allWarehouses.length];
    const product = products[(i * 2) % products.length];

    // eslint-disable-next-line no-await-in-loop
    await upsertSupplierOrderSeed(businessowner, supplierForOrder, employeeForOrder, warehouse, product, {
      ounits: 3 + (i % 5),
      oDate: new Date(2026, 2, (i % 20) + 2),
      dDate: new Date(2026, 2, (i % 20) + 7),
      status: i % 2 === 0 ? 'Pending' : 'Approved',
      paymentStatus: i % 2 === 0 ? 'Pending' : 'Paid',
      pAvail: i % 2 === 0 ? 'Expected' : 'Ready',
      dStatus: i % 2 === 0 ? 'Processing' : 'Dispatched',
      desc: `${SEED_DATA_TAG} supplier-order-${i + 1}`
    });
  }

  await upsertSupplierOrder(businessowner, supplier, employee, warehouseSecondary, products[2]);

  console.log(`${SEED_PREFIX} completed successfully.`);
  console.log(`${SEED_PREFIX} target owner: ${SAMPLE_CREDENTIALS.businessOwner.email}`);
  console.log(`${SEED_PREFIX} seeded counts:`);
  console.log(`- Warehouses: ${TARGET_COUNTS.warehouses}`);
  console.log(`- Employees: ${TARGET_COUNTS.employees}`);
  console.log(`- Suppliers: ${TARGET_COUNTS.suppliers}`);
  console.log(`- Categories: ${TARGET_COUNTS.categories}`);
  console.log(`- Products: ${TARGET_COUNTS.products}`);
  console.log(`- Customer Orders: ${TARGET_COUNTS.customerOrders}`);
  console.log(`- Supplier Orders: ${TARGET_COUNTS.supplierOrders}`);
  console.log('Use these credentials to log in and view seeded data:');
  console.log(`- Business Owner: ${SAMPLE_CREDENTIALS.businessOwner.email} / ${SAMPLE_CREDENTIALS.businessOwner.password}`);
  console.log(`- Manager: ${SAMPLE_CREDENTIALS.manager.email} / ${SAMPLE_CREDENTIALS.manager.password}`);
  console.log(`- Supplier: ${SAMPLE_CREDENTIALS.supplier.email} / ${SAMPLE_CREDENTIALS.supplier.password}`);
};

seed()
  .catch((error) => {
    console.error(`${SEED_PREFIX} failed:`, error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
