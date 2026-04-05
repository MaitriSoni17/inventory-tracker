jest.mock('../models/CustomerOrders', () => ({
  aggregate: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/SupplierOrders', () => ({
  find: jest.fn()
}));

jest.mock('../models/Warehouse', () => ({
  find: jest.fn()
}));

const CustomerOrders = require('../models/CustomerOrders');
const SupplierOrders = require('../models/SupplierOrders');
const Warehouse = require('../models/Warehouse');
const { conversationalBI } = require('../services/aiInsightsService');

describe('conversationalBI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('supports low-margin product queries without warehouse qualifier', async () => {
    Warehouse.find.mockReturnValue({
      select: jest.fn(() => Promise.resolve([]))
    });

    CustomerOrders.aggregate.mockResolvedValue([
      {
        _id: { productName: 'Alpha Mix', warehouse: null },
        qty: 10,
        revenue: 1000,
        avgSellUnitPrice: 100
      }
    ]);

    SupplierOrders.find.mockReturnValue({
      select: jest.fn(() => Promise.resolve([{ amount: 620, ounits: 10 }]))
    });

    const result = await conversationalBI('business-owner-id', 'top 10 low-margin products');

    expect(result.success).toBe(true);
    expect(result.intent).toBe('top_low_margin_products');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].productName).toBe('Alpha Mix');
  });
});