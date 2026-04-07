const { generateAIResponse } = require('./utils/chatbotHelper');

(async () => {
  const role = 'supplier';
  const userId = '64f1c2a1b2c3d4e5f6789014';
  const context = {
    totalOrders: 8,
    pendingOrders: 3,
    deliveredOrders: 4,
    cancelledOrders: 1,
    totalOrderValue: 48000,
    recentSupplierOrders: [
      { pName: 'Orange Spark 500ml', ounits: 10, amount: 1200, status: 'Pending', oDate: '2026-04-03', dDate: '2026-04-06' },
      { pName: 'Classic Salt Chips', ounits: 25, amount: 300, status: 'Delivered', oDate: '2026-04-01', dDate: '2026-04-04' },
      { pName: 'Mint Toothpaste', ounits: 12, amount: 90, status: 'Pending', oDate: '2026-04-02', dDate: '2026-04-07' }
    ]
  };

  const requestUser = {
    _id: userId,
    role: 'supplier',
    permissions: { canViewOrders: true, canEditOrders: true, canCreateOrders: true }
  };

  const queries = [
    'Show my dashboard',
    'Show my supply orders',
    'Show pending supply orders',
    'Show my latest 5 orders',
    'Show order details for Orange Spark 500ml',
    'Show orders due this week',
    'What is my total order value?',
    'Am I able to edit order?',
    'How do I update my supplier profile?',
    'Can I download reports?',
    'Which orders need immediate action?',
    'Show delivered supply orders'
  ];

  for (const q of queries) {
    const res = await generateAIResponse(q, role, context, userId, requestUser);
    const compact = String(res).replace(/\s+/g, ' ').trim();
    console.log('\nQ:', q);
    console.log('A:', compact.slice(0, 220));
  }
})();
