const OpenAI = require('openai');
const Product = require('../models/Products');
const CustomerOrders = require('../models/CustomerOrders');
const SupplierOrders = require('../models/SupplierOrders');
const Supplier = require('../models/Supplier');
const Notification = require('../models/Notification');
const StockMovement = require('../models/StockMovement');
const SalaryPayment = require('../models/SalaryPayment');
const Category = require('../models/Category');
const Employee = require('../models/Employee');
const Warehouse = require('../models/Warehouse');
const AIDataFixProposal = require('../models/AIDataFixProposal');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
const openaiClient = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const mean = (arr) => (arr.length ? arr.reduce((sum, x) => sum + x, 0) / arr.length : 0);

const stdDev = (arr) => {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  const variance = arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
};

const normalizeString = (value) => String(value || '').trim().toLowerCase();

const extractBusinessOwnerId = (req) => {
  if (req.role === 'businessowner') {
    return req.user._id;
  }
  return req.businessowner || req.user.businessowner;
};

const mapRoleForNotification = (role) => {
  if (role === 'businessowner') return 'BusinessOwner';
  if (role === 'supplier') return 'Supplier';
  return 'Employee';
};

const supplierLeadTimeStats = async (businessowner) => {
  const completedStatuses = ['delivered', 'completed'];
  const orders = await SupplierOrders.find({
    businessowner,
    oDate: { $exists: true },
    dDate: { $exists: true }
  }).select('supplier pName category oDate dDate status');

  const bySupplier = new Map();
  for (const order of orders) {
    const key = String(order.supplier || 'unknown');
    const leadDays = Math.max(1, Math.round((new Date(order.dDate) - new Date(order.oDate)) / DAY_MS));
    if (!bySupplier.has(key)) {
      bySupplier.set(key, { leadTimes: [], onTimeCount: 0, total: 0 });
    }
    const entry = bySupplier.get(key);
    entry.leadTimes.push(leadDays);
    entry.total += 1;
    if (completedStatuses.includes(normalizeString(order.status))) {
      entry.onTimeCount += new Date(order.dDate) <= new Date(order.oDate.getTime() + 7 * DAY_MS) ? 1 : 0;
    }
  }

  const stats = new Map();
  bySupplier.forEach((value, key) => {
    stats.set(key, {
      avgLeadTimeDays: Number(mean(value.leadTimes).toFixed(2)),
      reliability: value.total ? Number((value.onTimeCount / value.total).toFixed(2)) : 0.5,
      sampleSize: value.total
    });
  });

  return stats;
};

const avgLeadTimeForProduct = async (businessowner, productName, category) => {
  const query = { businessowner };
  if (productName) {
    query.pName = productName;
  } else if (category) {
    query.category = category;
  }

  const orders = await SupplierOrders.find(query).select('oDate dDate');
  if (!orders.length) {
    return 7;
  }

  const leadTimes = orders
    .map((order) => Math.round((new Date(order.dDate) - new Date(order.oDate)) / DAY_MS))
    .filter((days) => Number.isFinite(days) && days > 0);

  return leadTimes.length ? Math.max(2, Math.round(mean(leadTimes))) : 7;
};

const computeDemandForecastForProduct = async (product, businessowner, horizonDays = 30) => {
  const since = startOfDay(new Date(Date.now() - horizonDays * DAY_MS));

  const sales = await CustomerOrders.aggregate([
    {
      $match: {
        businessowner: product.businessowner,
        oDate: { $gte: since },
        products: { $exists: true, $ne: [] }
      }
    },
    { $unwind: '$products' },
    {
      $match: {
        'products.product': product._id
      }
    },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$oDate' } }
        },
        qty: { $sum: '$products.quantity' }
      }
    },
    { $sort: { '_id.day': 1 } }
  ]);

  const dayMap = new Map(sales.map((row) => [row._id.day, row.qty]));
  const dailySeries = [];

  for (let i = horizonDays - 1; i >= 0; i -= 1) {
    const day = startOfDay(new Date(Date.now() - i * DAY_MS));
    const key = day.toISOString().slice(0, 10);
    dailySeries.push(safeNumber(dayMap.get(key)));
  }

  const avgDaily = mean(dailySeries);
  const recent7 = mean(dailySeries.slice(-7));
  const previousWindow = dailySeries.slice(-28, -7);
  const previous21 = previousWindow.length ? mean(previousWindow) : avgDaily;
  const seasonalityFactor = previous21 > 0 ? clamp(recent7 / previous21, 0.7, 1.6) : 1;
  const expectedDailyDemand = Number((avgDaily * seasonalityFactor).toFixed(2));

  const dailyStd = stdDev(dailySeries);
  const coefficientOfVariation = avgDaily > 0 ? dailyStd / avgDaily : 2;
  const dataCoverage = clamp(sales.length / Math.max(10, horizonDays / 2), 0, 1);
  const confidence = Number(clamp(0.2 + dataCoverage * 0.45 + (1 - clamp(coefficientOfVariation, 0, 1.5) / 1.5) * 0.35, 0.05, 0.98).toFixed(2));

  const stock = safeNumber(product.totalProducts);
  const stockoutDays = expectedDailyDemand > 0 ? Math.floor(stock / expectedDailyDemand) : null;
  const expectedStockoutDate = stockoutDays !== null
    ? new Date(Date.now() + stockoutDays * DAY_MS).toISOString()
    : null;

  const leadTimeDays = await avgLeadTimeForProduct(businessowner, product.name, product.category);
  const reviewPeriodDays = 7;
  const bufferDays = Math.max(2, Math.round(leadTimeDays * 0.25));
  const recommendedStockTarget = Math.ceil(expectedDailyDemand * (leadTimeDays + reviewPeriodDays + bufferDays));
  const recommendedReorderQuantity = Math.max(0, recommendedStockTarget - stock);

  return {
    productId: product._id,
    productName: product.name,
    category: product.category,
    currentStock: stock,
    expectedDailyDemand,
    expectedWeeklyDemand: Number((expectedDailyDemand * 7).toFixed(2)),
    expectedStockoutDate,
    leadTimeDays,
    recommendedReorderQuantity,
    confidence,
    factors: {
      seasonalityFactor: Number(seasonalityFactor.toFixed(2)),
      coefficientOfVariation: Number(coefficientOfVariation.toFixed(2)),
      dataPoints: sales.length
    }
  };
};

const demandForecast = async (businessowner, options = {}) => {
  const horizonDays = clamp(safeNumber(options.horizonDays, 30), 14, 120);
  const products = await Product.find({ businessowner }).select('_id name category totalProducts businessowner');

  const items = await Promise.all(products.map((product) => computeDemandForecastForProduct(product, businessowner, horizonDays)));
  items.sort((a, b) => (new Date(a.expectedStockoutDate || '9999-12-31') - new Date(b.expectedStockoutDate || '9999-12-31')));

  return {
    horizonDays,
    generatedAt: new Date().toISOString(),
    totalProductsAnalyzed: items.length,
    atRiskCount: items.filter((item) => item.expectedStockoutDate && new Date(item.expectedStockoutDate) <= new Date(Date.now() + 14 * DAY_MS)).length,
    items
  };
};

const autoReorder = async (businessowner, options = {}) => {
  const budget = safeNumber(options.budget, Infinity);
  const forecast = await demandForecast(businessowner, options);
  const supplierStats = await supplierLeadTimeStats(businessowner);

  const plans = [];
  let remainingBudget = budget;

  for (const item of forecast.items) {
    const supplierOrder = await SupplierOrders.findOne({ businessowner, pName: item.productName }).sort({ oDate: -1 }).select('supplier amount ounits');
    const supplierStat = supplierOrder?.supplier ? supplierStats.get(String(supplierOrder.supplier)) : null;
    const reliability = supplierStat?.reliability ?? 0.6;
    const dynamicSafetyStockDays = Math.round(3 + (1 - reliability) * 7);
    const dynamicReorderPoint = Math.ceil(item.expectedDailyDemand * (item.leadTimeDays + dynamicSafetyStockDays));
    const minOrderQty = supplierOrder?.ounits ? Math.max(1, Math.ceil(supplierOrder.ounits * 0.2)) : 10;

    let qty = Math.max(item.recommendedReorderQuantity, dynamicReorderPoint - item.currentStock);
    if (qty > 0 && qty < minOrderQty) {
      qty = minOrderQty;
    }

    const estimatedUnitCost = supplierOrder?.amount && supplierOrder?.ounits
      ? safeNumber(supplierOrder.amount) / Math.max(1, safeNumber(supplierOrder.ounits))
      : 0;

    const estimatedOrderCost = Number((qty * estimatedUnitCost).toFixed(2));
    const canAfford = remainingBudget === Infinity || estimatedOrderCost <= remainingBudget;
    const finalQty = canAfford ? qty : 0;

    if (canAfford && remainingBudget !== Infinity) {
      remainingBudget -= estimatedOrderCost;
    }

    plans.push({
      productId: item.productId,
      productName: item.productName,
      currentStock: item.currentStock,
      dynamicReorderPoint,
      recommendedReorderQuantity: finalQty,
      deferredByCashConstraint: qty > 0 && finalQty === 0,
      estimatedUnitCost: Number(estimatedUnitCost.toFixed(2)),
      estimatedOrderCost,
      supplierLeadTimeReliability: Number(reliability.toFixed(2)),
      confidence: item.confidence,
      rationale: {
        expectedDailyDemand: item.expectedDailyDemand,
        leadTimeDays: item.leadTimeDays,
        safetyStockDays: dynamicSafetyStockDays,
        minOrderQty
      }
    });
  }

  plans.sort((a, b) => (b.dynamicReorderPoint - b.currentStock) - (a.dynamicReorderPoint - a.currentStock));

  return {
    generatedAt: new Date().toISOString(),
    budget: Number.isFinite(budget) ? budget : null,
    budgetRemaining: Number.isFinite(budget) ? Number(Math.max(0, remainingBudget).toFixed(2)) : null,
    reorderCount: plans.filter((plan) => plan.recommendedReorderQuantity > 0).length,
    plans
  };
};

const detectInventoryAnomalies = async (businessowner, options = {}) => {
  const days = clamp(safeNumber(options.days, 45), 14, 180);
  const since = new Date(Date.now() - days * DAY_MS);

  const movements = await StockMovement.find({ businessowner, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(1500)
    .select('product direction quantityChange source reason actorId actorRole createdAt');

  const productMovements = new Map();
  for (const move of movements) {
    const key = String(move.product);
    if (!productMovements.has(key)) productMovements.set(key, []);
    productMovements.get(key).push(move);
  }

  const anomalies = [];

  for (const [productId, rows] of productMovements.entries()) {
    const deltas = rows.map((row) => Math.abs(safeNumber(row.quantityChange))).filter((value) => value > 0);
    if (deltas.length < 6) continue;

    const m = mean(deltas);
    const sd = stdDev(deltas) || 1;

    rows.forEach((row) => {
      const magnitude = Math.abs(safeNumber(row.quantityChange));
      const z = (magnitude - m) / sd;
      if (z >= 2.5) {
        anomalies.push({
          type: 'stock_spike_or_drop',
          severity: z >= 3.5 ? 'high' : 'medium',
          productId,
          observedAt: row.createdAt,
          score: Number(clamp(z / 4, 0, 1).toFixed(2)),
          explanation: `Movement ${magnitude} is ${(z).toFixed(1)} standard deviations away from normal (${m.toFixed(1)}).`,
          details: {
            direction: row.direction,
            source: row.source,
            reason: row.reason || 'N/A',
            actorRole: row.actorRole
          }
        });
      }

      const hour = new Date(row.createdAt).getHours();
      if (normalizeString(row.direction) === 'adjustment' && magnitude >= Math.max(25, m * 2) && (hour < 6 || hour > 22)) {
        anomalies.push({
          type: 'potential_theft_or_unusual_adjustment',
          severity: 'high',
          productId,
          observedAt: row.createdAt,
          score: 0.92,
          explanation: `Large adjustment (${magnitude}) occurred outside normal business hours (${hour}:00).`,
          details: {
            source: row.source,
            reason: row.reason || 'No reason provided',
            actorRole: row.actorRole
          }
        });
      }
    });
  }

  const duplicateCandidates = await CustomerOrders.aggregate([
    { $match: { businessowner, oDate: { $gte: since } } },
    {
      $group: {
        _id: {
          cEmail: '$cEmail',
          amount: '$amount',
          tenMinBucket: {
            $dateToString: {
              format: '%Y-%m-%dT%H:%M',
              date: '$oDate'
            }
          }
        },
        count: { $sum: 1 },
        orderIds: { $push: '$_id' }
      }
    },
    { $match: { count: { $gte: 2 } } },
    { $limit: 100 }
  ]);

  duplicateCandidates.forEach((item) => {
    anomalies.push({
      type: 'duplicate_order_risk',
      severity: item.count >= 3 ? 'high' : 'medium',
      score: item.count >= 3 ? 0.9 : 0.7,
      observedAt: new Date(),
      explanation: `Detected ${item.count} orders with same customer/email and amount within a short time window.`,
      details: {
        email: item._id.cEmail,
        amount: item._id.amount,
        orderIds: item.orderIds
      }
    });
  });

  const returnFlags = await CustomerOrders.find({
    businessowner,
    $or: [
      { status: { $regex: /return|refund/i } },
      { dStatus: { $regex: /return|refund/i } }
    ],
    oDate: { $gte: since }
  }).select('_id cName cEmail amount oDate status dStatus');

  returnFlags.forEach((order) => {
    anomalies.push({
      type: 'suspicious_return_pattern',
      severity: safeNumber(order.amount) > 10000 ? 'high' : 'medium',
      score: safeNumber(order.amount) > 10000 ? 0.85 : 0.65,
      observedAt: order.oDate,
      explanation: `Return/refund order detected for ${order.cName || order.cEmail} with value ${order.amount}.`,
      details: {
        orderId: order._id,
        status: order.status,
        deliveryStatus: order.dStatus,
        amount: order.amount
      }
    });
  });

  anomalies.sort((a, b) => b.score - a.score);

  return {
    generatedAt: new Date().toISOString(),
    daysAnalyzed: days,
    anomalyCount: anomalies.length,
    anomalies
  };
};

const createAnomalyNotifications = async ({ businessowner, actorId, actorRole, anomalies }) => {
  if (!anomalies.length) return [];

  const managers = await Employee.find({ businessowner, role: { $in: ['manager', 'supervisor'] } }).select('_id role');
  const recipients = [{ id: businessowner, role: 'BusinessOwner' }, ...managers.map((employee) => ({ id: employee._id, role: 'Employee' }))];

  const topAnomalies = anomalies.slice(0, 5);
  const summary = topAnomalies.map((item, idx) => `${idx + 1}. ${item.type.replace(/_/g, ' ')} (${item.severity})`).join(' | ');

  const notifications = [];
  for (const recipient of recipients) {
    const saved = await Notification.create({
      recipient: recipient.id,
      recipientRole: recipient.role,
      sender: actorId,
      senderRole: actorRole,
      type: 'ai_anomaly_alert',
      title: 'AI Inventory Anomaly Alert',
      message: `Detected ${anomalies.length} unusual inventory events. ${summary}`,
      data: {
        total: anomalies.length,
        topAnomalies
      }
    });
    notifications.push(saved);
  }

  return notifications;
};

const supplierIntelligence = async (businessowner) => {
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * DAY_MS);
  const prev30 = new Date(now.getTime() - 60 * DAY_MS);

  const suppliers = await Supplier.find({ businessowner }).select('_id fname lname companyName email');

  const supplierCards = [];

  for (const supplier of suppliers) {
    const orders = await SupplierOrders.find({ businessowner, supplier: supplier._id })
      .select('amount ounits oDate dDate status dStatus pName category');

    if (!orders.length) {
      supplierCards.push({
        supplierId: supplier._id,
        supplierName: supplier.companyName || `${supplier.fname || ''} ${supplier.lname || ''}`.trim(),
        score: 0.4,
        fillRate: 0,
        delayRisk: 1,
        priceDrift: 0,
        defectReturnRatio: 0,
        recommendation: 'Insufficient history'
      });
      continue;
    }

    const total = orders.length;
    const completed = orders.filter((o) => /delivered|completed/i.test(String(o.status || ''))).length;
    const delayed = orders.filter((o) => new Date(o.dDate) > new Date(o.oDate.getTime() + 7 * DAY_MS)).length;
    const defectLike = orders.filter((o) => /reject|damage|return|issue/i.test(String(o.dStatus || ''))).length;

    const fillRate = completed / total;
    const delayRisk = delayed / total;
    const defectReturnRatio = defectLike / total;

    const recentPrices = orders
      .filter((o) => new Date(o.oDate) >= last30)
      .map((o) => safeNumber(o.amount) / Math.max(1, safeNumber(o.ounits)));

    const previousPrices = orders
      .filter((o) => new Date(o.oDate) >= prev30 && new Date(o.oDate) < last30)
      .map((o) => safeNumber(o.amount) / Math.max(1, safeNumber(o.ounits)));

    const recentAvg = mean(recentPrices);
    const previousAvg = mean(previousPrices);
    const priceDrift = previousAvg > 0 ? (recentAvg - previousAvg) / previousAvg : 0;

    const score = clamp(
      0.35 * fillRate +
      0.25 * (1 - delayRisk) +
      0.2 * (1 - clamp(Math.abs(priceDrift), 0, 1)) +
      0.2 * (1 - defectReturnRatio),
      0,
      1
    );

    supplierCards.push({
      supplierId: supplier._id,
      supplierName: supplier.companyName || `${supplier.fname || ''} ${supplier.lname || ''}`.trim(),
      score: Number(score.toFixed(2)),
      fillRate: Number(fillRate.toFixed(2)),
      delayRisk: Number(delayRisk.toFixed(2)),
      priceDrift: Number(priceDrift.toFixed(3)),
      defectReturnRatio: Number(defectReturnRatio.toFixed(2)),
      recommendation: score >= 0.75 ? 'Preferred supplier' : score >= 0.55 ? 'Use with monitoring' : 'High risk supplier'
    });
  }

  supplierCards.sort((a, b) => b.score - a.score);

  return {
    generatedAt: new Date().toISOString(),
    supplierCount: supplierCards.length,
    suppliers: supplierCards
  };
};

const conversationalBI = async (businessowner, queryText) => {
  const query = String(queryText || '').trim();
  if (!query) {
    return {
      success: false,
      message: 'query is required'
    };
  }

  const normalizedQuery = query.toLowerCase().replace(/[\s\-]+/g, ' ');
  const looksLikeLowMarginQuery = normalizedQuery.includes('low margin') && (
    normalizedQuery.includes('product') ||
    normalizedQuery.includes('products') ||
    normalizedQuery.includes('item') ||
    normalizedQuery.includes('items') ||
    normalizedQuery.includes('warehouse')
  );
  const topMatch = query.match(/\btop\s*(\d+)\b/i);
  const daysMatch = query.match(/\blast\s*(\d+)\s*days?\b/i);

  const lowMarginMatch = query.match(/top\s*(\d+)?\s*.*low[-\s]*margin.*last\s*(\d+)\s*days?.*warehouse/i)
    || query.match(/low[-\s]*margin.*warehouse/i)
    || (looksLikeLowMarginQuery ? [query, topMatch?.[1], daysMatch?.[1]] : null);

  if (lowMarginMatch) {
    const topN = clamp(safeNumber(lowMarginMatch?.[1] || topMatch?.[1], 10), 1, 50);
    const days = clamp(safeNumber(lowMarginMatch?.[2] || daysMatch?.[1], 30), 7, 365);
    const since = new Date(Date.now() - days * DAY_MS);

    const warehouseMap = new Map();
    const warehouses = await Warehouse.find({ businessowner }).select('_id wName');
    warehouses.forEach((wh) => warehouseMap.set(String(wh._id), wh.wName));

    const rows = await CustomerOrders.aggregate([
      {
        $match: {
          businessowner,
          oDate: { $gte: since },
          products: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$products' },
      {
        $group: {
          _id: {
            productName: '$products.productName',
            warehouse: '$warehouse'
          },
          qty: { $sum: '$products.quantity' },
          revenue: { $sum: '$products.totalPrice' },
          avgSellUnitPrice: { $avg: '$products.unitPrice' }
        }
      }
    ]);

    const enriched = [];
    for (const row of rows) {
      const supplierRows = await SupplierOrders.find({
        businessowner,
        pName: row._id.productName,
        oDate: { $gte: since }
      }).select('amount ounits');

      const unitCosts = supplierRows
        .map((item) => safeNumber(item.amount) / Math.max(1, safeNumber(item.ounits)))
        .filter((value) => value > 0);

      const avgUnitCost = unitCosts.length ? mean(unitCosts) : safeNumber(row.avgSellUnitPrice) * 0.62;
      const avgSell = safeNumber(row.avgSellUnitPrice);
      const margin = avgSell > 0 ? (avgSell - avgUnitCost) / avgSell : 0;

      enriched.push({
        productName: row._id.productName,
        warehouse: warehouseMap.get(String(row._id.warehouse)) || 'Unassigned',
        quantitySold: row.qty,
        revenue: Number(safeNumber(row.revenue).toFixed(2)),
        avgUnitCost: Number(avgUnitCost.toFixed(2)),
        avgUnitSellPrice: Number(avgSell.toFixed(2)),
        margin: Number(margin.toFixed(3))
      });
    }

    enriched.sort((a, b) => a.margin - b.margin);
    const top = enriched.slice(0, topN);

    return {
      success: true,
      intent: 'top_low_margin_products',
      interpretation: {
        topN,
        days,
        matchedPattern: normalizedQuery.includes('warehouse') ? 'low margin products by warehouse' : 'low margin products'
      },
      chart: {
        type: 'bar',
        xKey: 'productName',
        yKey: 'margin',
        seriesName: 'Margin Ratio'
      },
      rows: top,
      export: {
        format: 'json',
        rowCount: top.length
      }
    };
  }

  return {
    success: false,
    message: 'Unsupported BI query for now. Try: "top 10 low-margin products" or "top 10 low-margin products in last 30 days by warehouse".'
  };
};

const tryParseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
};

const invoiceOCR = async ({ file, expectedSupplierOrderId, businessowner }) => {
  const mimeType = file?.mimetype || '';
  const isImage = /^image\//i.test(mimeType);
  const isPdf = /pdf/i.test(mimeType);

  if (!isImage && !isPdf) {
    return {
      success: false,
      message: 'Only image or PDF invoices are supported.'
    };
  }

  if (!openaiClient || !isImage) {
    return {
      success: false,
      message: 'OCR extraction requires OPENAI_API_KEY and currently supports image files.'
    };
  }

  const base64 = file.buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const completion = await openaiClient.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'Extract invoice fields into strict JSON with keys: supplierName, invoiceNumber, invoiceDate, subtotal, tax, total, currency, lineItems[]. lineItems must include description, quantity, unitPrice, lineTotal.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Parse this invoice image and return only valid JSON.' },
          { type: 'input_image', image_url: dataUrl }
        ]
      }
    ]
  });

  const rawText = completion.output_text || '';
  const extracted = tryParseJson(rawText);

  if (!extracted) {
    return {
      success: false,
      message: 'OCR completed, but JSON parsing failed. Review model output format.',
      rawText
    };
  }

  const result = {
    success: true,
    extracted
  };

  if (expectedSupplierOrderId) {
    const expected = await SupplierOrders.findOne({ _id: expectedSupplierOrderId, businessowner }).select('pName amount ounits supplier dDate');
    if (expected) {
      const extractedItems = Array.isArray(extracted.lineItems) ? extracted.lineItems : [];
      const totalExtractedQty = extractedItems.reduce((sum, item) => sum + safeNumber(item.quantity), 0);
      const extractedTotal = safeNumber(extracted.total, safeNumber(extracted.subtotal) + safeNumber(extracted.tax));

      const mismatches = [];
      if (expected.pName && extractedItems.length && !extractedItems.some((item) => normalizeString(item.description).includes(normalizeString(expected.pName)))) {
        mismatches.push('Product name mismatch with expected supplier order.');
      }

      if (Math.abs(extractedTotal - safeNumber(expected.amount)) > Math.max(1, safeNumber(expected.amount) * 0.05)) {
        mismatches.push('Invoice total differs from expected order amount by more than 5%.');
      }

      if (Math.abs(totalExtractedQty - safeNumber(expected.ounits)) > Math.max(1, safeNumber(expected.ounits) * 0.1)) {
        mismatches.push('Invoice quantity differs from expected units by more than 10%.');
      }

      result.reconciliation = {
        expectedOrderId: expected._id,
        mismatches,
        status: mismatches.length ? 'flagged' : 'matched'
      };
    }
  }

  return result;
};

const workflowCopilot = async ({ businessowner, role, userId }) => {
  const now = new Date();
  const twoWeeks = new Date(Date.now() + 14 * DAY_MS);

  const overdueOrders = await CustomerOrders.countDocuments({
    businessowner,
    dDate: { $lt: now },
    status: { $nin: ['Delivered', 'Completed'] }
  });

  const lowStock = await Product.countDocuments({ businessowner, totalProducts: { $lte: 10 } });
  const pendingSalary = await SalaryPayment.countDocuments({ businessowner, status: 'pending' });
  const supplierDueSoon = await SupplierOrders.countDocuments({
    businessowner,
    dDate: { $gte: now, $lte: twoWeeks },
    status: { $nin: ['delivered', 'completed'] }
  });

  const suggestions = [
    {
      key: 'overdue_orders',
      priority: overdueOrders > 15 ? 'high' : overdueOrders > 5 ? 'medium' : 'low',
      message: `${overdueOrders} orders are overdue.`,
      actionPath: '/dashboard/orders',
      count: overdueOrders
    },
    {
      key: 'low_stock',
      priority: lowStock > 25 ? 'high' : lowStock > 10 ? 'medium' : 'low',
      message: `${lowStock} products need restock attention.`,
      actionPath: '/dashboard/products',
      count: lowStock
    },
    {
      key: 'salary_approvals',
      priority: pendingSalary > 0 ? 'medium' : 'low',
      message: `${pendingSalary} salary payments are pending approval/completion.`,
      actionPath: '/dashboard/salary',
      count: pendingSalary
    },
    {
      key: 'supplier_due',
      priority: supplierDueSoon > 10 ? 'high' : supplierDueSoon > 3 ? 'medium' : 'low',
      message: `${supplierDueSoon} supplier deliveries are due in the next 14 days.`,
      actionPath: '/dashboard/reports',
      count: supplierDueSoon
    }
  ];

  if (role === 'supplier') {
    const myPending = await SupplierOrders.countDocuments({
      businessowner,
      supplier: userId,
      status: { $nin: ['delivered', 'completed'] }
    });

    suggestions.unshift({
      key: 'supplier_pending_orders',
      priority: myPending > 8 ? 'high' : myPending > 3 ? 'medium' : 'low',
      message: `${myPending} assigned supplier orders need progress updates.`,
      actionPath: '/dashboard/suppliersorders',
      count: myPending
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    role,
    suggestions: suggestions.sort((a, b) => {
      const order = { high: 3, medium: 2, low: 1 };
      return order[b.priority] - order[a.priority];
    })
  };
};

const notificationPriorityWeight = {
  ai_anomaly_alert: 100,
  product_low_stock_alert: 90,
  supplier_order_delivery_alert: 80,
  customer_order_delivery_alert: 80,
  salary_due_alert: 75,
  ai_workflow_alert: 70,
  ai_reorder_alert: 70,
  ai_data_quality_alert: 68,
  message: 40,
  chat_message: 35
};

const prioritizeNotifications = async ({ userId, role }) => {
  const capitalizedRole = mapRoleForNotification(role);
  const notifications = await Notification.find({ recipient: userId, recipientRole: capitalizedRole })
    .sort({ createdAt: -1 })
    .limit(120)
    .select('_id type title message data createdAt isRead');

  const scored = notifications.map((item) => {
    const base = notificationPriorityWeight[item.type] || 30;
    const ageHours = Math.max(0, (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60));
    const freshnessBoost = clamp(24 - ageHours, 0, 24);
    const unreadBoost = item.isRead ? 0 : 15;
    const score = Number((base + freshnessBoost + unreadBoost).toFixed(2));

    return {
      id: item._id,
      type: item.type,
      title: item.title,
      message: item.message,
      createdAt: item.createdAt,
      isRead: item.isRead,
      priorityScore: score,
      priorityBand: score >= 90 ? 'critical' : score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low'
    };
  });

  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  const digest = {
    whatChanged: `${scored.filter((item) => !item.isRead).length} unread notifications across inventory, orders, and operations.`,
    whatMatters: scored.slice(0, 3).map((item) => item.title),
    whatToDoNow: scored.slice(0, 3).map((item) => item.message)
  };

  return {
    generatedAt: new Date().toISOString(),
    total: scored.length,
    prioritized: scored,
    dailyDigest: digest
  };
};

const cashForecast = async ({ businessowner, days = 30, reorderMultiplier = 1 }) => {
  const horizon = clamp(safeNumber(days, 30), 7, 180);
  const since = new Date(Date.now() - horizon * DAY_MS);
  const until = new Date(Date.now() + horizon * DAY_MS);

  const recentOrders = await CustomerOrders.find({ businessowner, oDate: { $gte: since } }).select('amount oDate');
  const pendingSupplier = await SupplierOrders.find({ businessowner, status: { $nin: ['delivered', 'completed', 'cancelled'] } }).select('amount dDate');
  const salary = await SalaryPayment.find({ businessowner, paymentDate: { $gte: new Date(), $lte: until } }).select('amount status paymentDate');

  const recentInflow = recentOrders.reduce((sum, order) => sum + safeNumber(order.amount), 0);
  const avgDailyInflow = recentInflow / Math.max(1, horizon);
  const projectedInflow = Number((avgDailyInflow * horizon).toFixed(2));

  const supplierOutflow = pendingSupplier.reduce((sum, order) => sum + safeNumber(order.amount), 0);
  const salaryOutflow = salary.reduce((sum, payment) => sum + safeNumber(payment.amount), 0);
  const baselineOutflow = Number((supplierOutflow + salaryOutflow).toFixed(2));

  const scenarioOutflow = Number((baselineOutflow * clamp(safeNumber(reorderMultiplier, 1), 0.5, 2)).toFixed(2));

  return {
    generatedAt: new Date().toISOString(),
    days: horizon,
    baseline: {
      projectedInflow,
      projectedOutflow: baselineOutflow,
      projectedProfitability: Number((projectedInflow - baselineOutflow).toFixed(2))
    },
    scenario: {
      reorderMultiplier: clamp(safeNumber(reorderMultiplier, 1), 0.5, 2),
      projectedOutflow: scenarioOutflow,
      projectedProfitability: Number((projectedInflow - scenarioOutflow).toFixed(2))
    }
  };
};

const dataQualityGuardrails = async ({ businessowner, actorId, actorRole, createFixProposals = true }) => {
  const products = await Product.find({ businessowner }).select('_id name category price totalProducts brand mDate eDate');
  const suppliers = await Supplier.find({ businessowner }).select('_id email companyName fname lname phone');
  const categories = await Category.find({ businessowner }).select('_id cName');

  const validCategoryNames = new Set(categories.map((cat) => normalizeString(cat.cName)));

  const findings = [];
  const proposals = [];

  const productDedupMap = new Map();
  for (const product of products) {
    const dedupKey = `${normalizeString(product.name)}::${normalizeString(product.brand)}`;
    if (!productDedupMap.has(dedupKey)) {
      productDedupMap.set(dedupKey, []);
    }
    productDedupMap.get(dedupKey).push(product);

    if (safeNumber(product.price, -1) < 0 || safeNumber(product.totalProducts, -1) < 0) {
      findings.push({
        type: 'impossible_product_values',
        severity: 'high',
        entity: 'Product',
        entityId: product._id,
        message: 'Negative price or stock detected.',
        suggestedFix: 'Set negative values to zero after verification.'
      });

      if (createFixProposals && safeNumber(product.price, 0) < 0) {
        proposals.push({
          businessowner,
          createdBy: actorId,
          createdByRole: actorRole,
          type: 'product_field_update',
          targetModel: 'Product',
          targetId: product._id,
          reason: 'Negative price detected by AI data quality guardrails.',
          confidence: 0.96,
          currentValue: product.price,
          suggestedValue: 0,
          fieldPath: 'price'
        });
      }

      if (createFixProposals && safeNumber(product.totalProducts, 0) < 0) {
        proposals.push({
          businessowner,
          createdBy: actorId,
          createdByRole: actorRole,
          type: 'product_field_update',
          targetModel: 'Product',
          targetId: product._id,
          reason: 'Negative stock detected by AI data quality guardrails.',
          confidence: 0.95,
          currentValue: product.totalProducts,
          suggestedValue: 0,
          fieldPath: 'totalProducts'
        });
      }
    }

    if (product.mDate && product.eDate && new Date(product.mDate) > new Date(product.eDate)) {
      findings.push({
        type: 'date_consistency_issue',
        severity: 'medium',
        entity: 'Product',
        entityId: product._id,
        message: 'Manufacture date is after expiry date.',
        suggestedFix: 'Swap/repair date values after review.'
      });
    }

    const categoryLooksLikeName = String(product.category || '').length > 0 && !String(product.category).match(/^[a-f\d]{24}$/i);
    if (categoryLooksLikeName && !validCategoryNames.has(normalizeString(product.category))) {
      findings.push({
        type: 'inconsistent_category_naming',
        severity: 'medium',
        entity: 'Product',
        entityId: product._id,
        message: `Category value "${product.category}" does not match known category list.`,
        suggestedFix: 'Map category to canonical category name/id.'
      });
    }
  }

  productDedupMap.forEach((items) => {
    if (items.length >= 2) {
      findings.push({
        type: 'duplicate_product_risk',
        severity: items.length >= 3 ? 'high' : 'medium',
        entity: 'Product',
        entityId: items[0]._id,
        message: `Detected ${items.length} potentially duplicate products by name+brand.`,
        suggestedFix: 'Review and merge duplicates or adjust naming.'
      });
    }
  });

  const supplierEmailSet = new Map();
  for (const supplier of suppliers) {
    const email = normalizeString(supplier.email);
    if (!email) continue;

    if (supplierEmailSet.has(email)) {
      findings.push({
        type: 'duplicate_supplier_risk',
        severity: 'medium',
        entity: 'Supplier',
        entityId: supplier._id,
        message: `Duplicate supplier email detected (${supplier.email}).`,
        suggestedFix: 'Keep primary supplier record and archive duplicates.'
      });
    } else {
      supplierEmailSet.set(email, supplier._id);
    }
  }

  let storedProposals = [];
  if (createFixProposals && proposals.length) {
    storedProposals = await AIDataFixProposal.insertMany(proposals);
  }

  return {
    generatedAt: new Date().toISOString(),
    findingCount: findings.length,
    findings,
    fixProposalCount: storedProposals.length,
    fixProposals: storedProposals.map((proposal) => ({
      id: proposal._id,
      type: proposal.type,
      targetModel: proposal.targetModel,
      targetId: proposal.targetId,
      fieldPath: proposal.fieldPath,
      currentValue: proposal.currentValue,
      suggestedValue: proposal.suggestedValue,
      confidence: proposal.confidence,
      status: proposal.status
    }))
  };
};

const applyApprovedFixProposal = async ({ proposalId, reviewerId }) => {
  const proposal = await AIDataFixProposal.findById(proposalId);
  if (!proposal) {
    return { success: false, message: 'Proposal not found.' };
  }

  if (!['pending', 'approved'].includes(proposal.status)) {
    return { success: false, message: `Proposal cannot be applied from status ${proposal.status}.` };
  }

  const model = proposal.targetModel === 'Product' ? Product : Supplier;
  const target = await model.findById(proposal.targetId);
  if (!target) {
    proposal.status = 'failed';
    proposal.notes = 'Target entity no longer exists.';
    proposal.reviewedBy = reviewerId;
    proposal.reviewedAt = new Date();
    await proposal.save();

    return { success: false, message: 'Target entity not found.', proposal };
  }

  const segments = String(proposal.fieldPath).split('.').filter(Boolean);
  let cursor = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (!Object.prototype.hasOwnProperty.call(cursor, segment) || typeof cursor[segment] !== 'object') {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }

  cursor[segments[segments.length - 1]] = proposal.suggestedValue;
  await target.save();

  proposal.status = 'applied';
  proposal.reviewedBy = reviewerId;
  proposal.reviewedAt = new Date();
  proposal.appliedAt = new Date();
  await proposal.save();

  return { success: true, proposal };
};

const runAllAIInsights = async ({ businessowner, role, userId, actorId, actorRole, options = {} }) => {
  const defaultSections = [
    'demandForecast',
    'autoReorder',
    'anomalyDetection',
    'supplierIntelligence',
    'workflowCopilot',
    'prioritizedNotifications',
    'cashAndProfitForecast',
    'dataQualityGuardrails'
  ];

  const includeSections = Array.isArray(options.includeSections) && options.includeSections.length > 0
    ? options.includeSections
    : defaultSections;

  const includeSet = new Set(includeSections);
  const result = {
    generatedAt: new Date().toISOString()
  };

  const tasks = [];

  if (includeSet.has('demandForecast')) {
    tasks.push(
      demandForecast(businessowner, options).then((value) => {
        result.demandForecast = value;
      })
    );
  }

  if (includeSet.has('autoReorder')) {
    tasks.push(
      autoReorder(businessowner, options).then((value) => {
        result.autoReorder = value;
      })
    );
  }

  if (includeSet.has('anomalyDetection')) {
    tasks.push(
      detectInventoryAnomalies(businessowner, options).then((value) => {
        result.anomalyDetection = value;
      })
    );
  }

  if (includeSet.has('supplierIntelligence')) {
    tasks.push(
      supplierIntelligence(businessowner).then((value) => {
        result.supplierIntelligence = value;
      })
    );
  }

  if (includeSet.has('workflowCopilot')) {
    tasks.push(
      workflowCopilot({ businessowner, role, userId }).then((value) => {
        result.workflowCopilot = value;
      })
    );
  }

  if (includeSet.has('prioritizedNotifications')) {
    tasks.push(
      prioritizeNotifications({ userId, role }).then((value) => {
        result.prioritizedNotifications = value;
      })
    );
  }

  if (includeSet.has('cashAndProfitForecast')) {
    tasks.push(
      cashForecast({ businessowner, days: options.days, reorderMultiplier: options.reorderMultiplier }).then((value) => {
        result.cashAndProfitForecast = value;
      })
    );
  }

  if (includeSet.has('dataQualityGuardrails')) {
    tasks.push(
      dataQualityGuardrails({ businessowner, actorId, actorRole, createFixProposals: true }).then((value) => {
        result.dataQualityGuardrails = value;
      })
    );
  }

  await Promise.all(tasks);

  if (options.notifyAnomalies && result.anomalyDetection?.anomalies) {
    await createAnomalyNotifications({ businessowner, actorId, actorRole, anomalies: result.anomalyDetection.anomalies });
  }

  return result;
};

module.exports = {
  demandForecast,
  autoReorder,
  detectInventoryAnomalies,
  createAnomalyNotifications,
  supplierIntelligence,
  conversationalBI,
  invoiceOCR,
  workflowCopilot,
  prioritizeNotifications,
  cashForecast,
  dataQualityGuardrails,
  applyApprovedFixProposal,
  runAllAIInsights
};
