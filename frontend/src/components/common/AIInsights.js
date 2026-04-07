import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall, parseResponse } from '../../utils/apiClient';
import { useRole } from '../../context/RoleContext';
import '../../styles/ai-insights.css';

const sections = [
  {
    key: 'demandForecast',
    label: 'Demand Forecasting',
    permissions: ['canViewProducts']
  },
  {
    key: 'autoReorder',
    label: 'Smart Auto-Reorder',
    permissions: ['canViewProducts']
  },
  {
    key: 'anomalyDetection',
    label: 'Inventory Anomaly Detection',
    permissions: ['canViewProducts']
  },
  {
    key: 'supplierIntelligence',
    label: 'Supplier Intelligence',
    permissions: ['canViewOrders']
  },
  {
    key: 'workflowCopilot',
    label: 'Workflow Copilot',
    permissions: ['canViewDashboard']
  },
  {
    key: 'prioritizedNotifications',
    label: 'Notification Prioritization',
    permissions: ['canViewNotifications']
  },
  {
    key: 'cashAndProfitForecast',
    label: 'Cash & Profit Forecast',
    permissions: ['canViewAnalytics']
  },
  {
    key: 'dataQualityGuardrails',
    label: 'Data Quality Guardrails',
    permissions: ['canViewAnalytics']
  }
];

const summaryCards = [
  {
    title: 'At Risk Products',
    sectionKey: 'demandForecast',
    value: (insights) => insights?.demandForecast?.atRiskCount ?? 0,
    subText: (insights) => `${insights?.demandForecast?.totalProductsAnalyzed ?? 0} analyzed`
  },
  {
    title: 'Reorder Plans',
    sectionKey: 'autoReorder',
    value: (insights) => insights?.autoReorder?.reorderCount ?? 0,
    subText: (insights) => `Budget left: ${insights?.autoReorder?.budgetRemaining ?? 'N/A'}`
  },
  {
    title: 'Anomalies',
    sectionKey: 'anomalyDetection',
    value: (insights) => insights?.anomalyDetection?.anomalyCount ?? 0,
    subText: () => 'Potential inventory risks detected'
  },
  {
    title: 'Data Quality Findings',
    sectionKey: 'dataQualityGuardrails',
    value: (insights) => insights?.dataQualityGuardrails?.findingCount ?? 0,
    subText: (insights) => `${insights?.dataQualityGuardrails?.fixProposalCount ?? 0} fix proposals created`
  }
];

const supplierSummaryCards = [
  {
    title: 'Pending Actions',
    sectionKey: 'workflowCopilot',
    value: (insights) => Array.isArray(insights?.workflowCopilot?.suggestions)
      ? insights.workflowCopilot.suggestions.length
      : 0,
    subText: () => 'Recommended actions from workflow copilot'
  },
  {
    title: 'High Priority Actions',
    sectionKey: 'workflowCopilot',
    value: (insights) => {
      const suggestions = Array.isArray(insights?.workflowCopilot?.suggestions)
        ? insights.workflowCopilot.suggestions
        : [];
      return suggestions.filter((item) => ['high', 'critical'].includes(String(item?.priority || '').toLowerCase())).length;
    },
    subText: () => 'Actions that need quick attention'
  },
  {
    title: 'Unread Alerts',
    sectionKey: 'prioritizedNotifications',
    value: (insights) => insights?.prioritizedNotifications?.total ?? 0,
    subText: () => 'Notifications requiring review'
  }
];

const roleExperienceConfig = {
  businessowner: {
    heroTitle: 'Inventory intelligence in one place',
    heroCopy: 'Forecast demand, optimize reorders, detect anomalies, and get role-aware daily actions.',
    runButtonLabel: 'Run Full AI Suite',
    runningButtonLabel: 'Running AI Suite...',
    emptySectionMessage: 'No AI insights are available for your current permissions.',
    noBiPermissionMessage: 'You do not have permission to view conversational BI data.'
  },
  supplier: {
    heroTitle: 'Supplier operations intelligence in one place',
    heroCopy: 'Track overdue deliveries, prioritize your order updates, and review actionable alerts quickly.',
    runButtonLabel: 'Refresh Supplier Insights',
    runningButtonLabel: 'Refreshing Insights...',
    emptySectionMessage: 'No supplier-focused AI insights are available right now.',
    noBiPermissionMessage: 'Conversational BI is not available for supplier accounts. Use Workflow Copilot and Notifications below.'
  }
};

const roleSectionOrder = {
  supplier: ['workflowCopilot', 'prioritizedNotifications', 'supplierIntelligence'],
  businessowner: ['demandForecast', 'autoReorder', 'anomalyDetection', 'supplierIntelligence', 'workflowCopilot', 'prioritizedNotifications', 'cashAndProfitForecast', 'dataQualityGuardrails']
};

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const SNAPSHOT_POLL_MS = 60 * 1000;

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const formatCurrency = (value) => {
  const amount = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
};

const insightFallback = 'Run Full AI Suite to populate this section.';

const normalizeDashboardPath = (path) => {
  if (!path || typeof path !== 'string') return null;

  const trimmed = path.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/dashboard')) return trimmed;
  if (trimmed.startsWith('/')) return `/dashboard${trimmed}`;
  if (trimmed.startsWith('dashboard/')) return `/${trimmed}`;
  return `/dashboard/${trimmed.replace(/^\/+/, '')}`;
};

const remapPathForRole = (path, role) => {
  if (!path || role !== 'supplier') return path;

  // Supplier accounts should navigate to supplier-safe pages.
  const supplierRouteMap = {
    '/dashboard/orders': '/dashboard/suppliersorders',
    '/dashboard/suppliers': '/dashboard/suppliersorders',
    '/dashboard/employee': '/dashboard/suppliersorders',
    '/dashboard/products': '/dashboard/suppliersorders'
  };

  return supplierRouteMap[path] || path;
};

const getInsightTargetPath = (sectionKey, role, data = {}) => {
  if (sectionKey === 'demandForecast' || sectionKey === 'autoReorder' || sectionKey === 'anomalyDetection') {
    return '/dashboard/products';
  }

  if (sectionKey === 'supplierIntelligence') {
    if (role === 'businessowner') return '/dashboard/suppliers';
    if (role === 'supplier') return '/dashboard/suppliersorders';
    return '/dashboard/orders';
  }

  if (sectionKey === 'workflowCopilot') {
    const firstActionPath = Array.isArray(data?.suggestions)
      ? remapPathForRole(normalizeDashboardPath(data.suggestions.find((item) => item?.actionPath)?.actionPath), role)
      : null;
    return firstActionPath || (role === 'supplier' ? '/dashboard/suppliersorders' : '/dashboard/orders');
  }

  if (sectionKey === 'prioritizedNotifications') {
    return '/dashboard/notifications';
  }

  if (sectionKey === 'cashAndProfitForecast' || sectionKey === 'dataQualityGuardrails') {
    return '/dashboard/reports';
  }

  return '/dashboard';
};

const getProductDetailPath = (productId) => {
  if (!productId) return null;
  const normalizedId = String(productId).trim();
  if (!normalizedId) return null;
  return `/dashboard/product/${encodeURIComponent(normalizedId)}`;
};

const renderBadge = (label, value, tone = 'neutral') => (
  <div className={`ai-mini-badge ai-mini-badge-${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const renderListItem = (title, lines, tone = 'neutral', itemKey = title, onClick = null) => (
  <div
    className={`ai-list-item ai-list-item-${tone} ${onClick ? 'ai-list-item-clickable' : ''}`}
    key={itemKey}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick || undefined}
    onKeyDown={onClick ? (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    } : undefined}
  >
    <div className="ai-list-item-title">{title}</div>
    <div className="ai-list-item-body">
      {lines.map((line, index) => (
        <div key={`${itemKey}-${index}`} className="ai-list-line">{line}</div>
      ))}
    </div>
  </div>
);

const renderSectionBody = (sectionKey, data, role, onNavigate) => {
  if (!data || data.status === insightFallback) {
    return <div className="ai-empty-state">{insightFallback}</div>;
  }

  const sectionPath = getInsightTargetPath(sectionKey, role, data);
  const navigateToSection = () => onNavigate(sectionPath);

  if (sectionKey === 'demandForecast') {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
      <>
        <div className="ai-summary-grid">
          {renderBadge('Analyzed', data.totalProductsAnalyzed ?? 0)}
          {renderBadge('At Risk', data.atRiskCount ?? 0, (data.atRiskCount ?? 0) > 0 ? 'warning' : 'success')}
          {renderBadge('Horizon', `${data.horizonDays ?? 0} days`)}
        </div>
        <div className="ai-section-list">
          {items.slice(0, 3).map((item, index) => {
            const productPath = getProductDetailPath(item?.productId);
            return renderListItem(item.productName || 'Unnamed product', [
              `Current stock: ${item.currentStock ?? 0}`,
              `Expected daily demand: ${Number(item.expectedDailyDemand ?? 0).toFixed(2)}`,
              `Recommended reorder: ${item.recommendedReorderQuantity ?? 0}`,
              `Stockout date: ${formatDate(item.expectedStockoutDate)}`
            ], 'warning', `demand-${index}-${item.productName || 'item'}`, () => onNavigate(productPath || '/dashboard/products'));
          })}
        </div>
      </>
    );
  }

  if (sectionKey === 'autoReorder') {
    const plans = Array.isArray(data.plans) ? data.plans : [];
    return (
      <>
        <div className="ai-summary-grid">
          {renderBadge('Plans', data.reorderCount ?? 0)}
          {renderBadge('Budget left', data.budgetRemaining != null ? formatCurrency(data.budgetRemaining) : 'N/A')}
        </div>
        <div className="ai-section-list">
          {plans.slice(0, 3).map((plan, index) => {
            const productPath = getProductDetailPath(plan?.productId);
            return renderListItem(plan.productName || 'Unnamed product', [
              `Reorder qty: ${plan.recommendedReorderQuantity ?? 0}`,
              `Reorder point: ${plan.dynamicReorderPoint ?? 0}`,
              `Estimated cost: ${formatCurrency(plan.estimatedOrderCost ?? 0)}`,
              `Priority: ${plan.deferredByCashConstraint ? 'Deferred by budget' : 'Ready to order'}`
            ], plan.deferredByCashConstraint ? 'warning' : 'success', `reorder-${index}-${plan.productName || 'item'}`, () => onNavigate(productPath || '/dashboard/products'));
          })}
        </div>
      </>
    );
  }

  if (sectionKey === 'anomalyDetection') {
    const anomalies = Array.isArray(data.anomalies) ? data.anomalies : [];
    return (
      <>
        <div className="ai-summary-grid">
          {renderBadge('Anomalies', data.anomalyCount ?? 0, (data.anomalyCount ?? 0) > 0 ? 'danger' : 'success')}
        </div>
        <div className="ai-section-list">
          {anomalies.slice(0, 3).map((item, index) => renderListItem(item.type?.replace(/_/g, ' ') || 'Anomaly', [
            `Severity: ${item.severity || 'N/A'}`,
            `Score: ${Number(item.score ?? 0).toFixed(2)}`,
            `Product: ${item.productId || 'N/A'}`,
            `Observed: ${formatDate(item.observedAt)}`
          ], item.severity === 'high' ? 'danger' : 'warning', `anomaly-${index}-${item.type || 'item'}`, navigateToSection))}
        </div>
      </>
    );
  }

  if (sectionKey === 'supplierIntelligence') {
    const suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
    return (
      <>
        <div className="ai-summary-grid">
          {renderBadge('Suppliers scored', data.supplierCount ?? 0)}
        </div>
        <div className="ai-section-list">
          {suppliers.slice(0, 3).map((supplier, index) => renderListItem(supplier.supplierName || 'Supplier', [
            `Score: ${Number(supplier.score ?? 0).toFixed(2)}`,
            `Fill rate: ${Number((supplier.fillRate ?? 0) * 100).toFixed(0)}%`,
            `Delay risk: ${Number((supplier.delayRisk ?? 0) * 100).toFixed(0)}%`,
            `Recommendation: ${supplier.recommendation || 'N/A'}`
          ], supplier.score >= 0.75 ? 'success' : supplier.score >= 0.55 ? 'warning' : 'danger', `supplier-${index}-${supplier.supplierName || 'item'}`, navigateToSection))}
        </div>
      </>
    );
  }

  if (sectionKey === 'workflowCopilot') {
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    return (
      <>
        <div className="ai-summary-grid">
          {renderBadge('Role', data.role || 'N/A')}
          {renderBadge('Actions', suggestions.length)}
        </div>
        <div className="ai-section-list">
          {suggestions.slice(0, 4).map((item, index) => {
            const actionPath = remapPathForRole(normalizeDashboardPath(item?.actionPath), role) || sectionPath;
            return renderListItem(item.key?.replace(/_/g, ' ') || 'Workflow item', [
              `Priority: ${item.priority || 'N/A'}`,
              item.message || 'No message available',
              `Route: ${actionPath || 'N/A'}`
            ], item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'neutral', `workflow-${index}-${item.key || 'item'}`, () => onNavigate(actionPath));
          })}
        </div>
      </>
    );
  }

  if (sectionKey === 'prioritizedNotifications') {
    const prioritized = Array.isArray(data.prioritized) ? data.prioritized : [];
    return (
      <>
        <div className="ai-summary-grid">
          {renderBadge('Total', data.total ?? 0)}
          {renderBadge('Digest', data.dailyDigest?.whatChanged || 'N/A')}
        </div>
        <div className="ai-section-list">
          {prioritized.slice(0, 3).map((item, index) => renderListItem(item.title || 'Notification', [
            `Band: ${item.priorityBand || 'N/A'}`,
            item.message || 'No message available',
            `Created: ${formatDate(item.createdAt)}`
          ], item.priorityBand === 'critical' ? 'danger' : item.priorityBand === 'high' ? 'warning' : 'neutral', `notification-${index}-${item.title || 'item'}`, navigateToSection))}
        </div>
      </>
    );
  }

  if (sectionKey === 'cashAndProfitForecast') {
    return (
      <>
        <div className="ai-summary-grid">
          {renderBadge('Projected inflow', formatCurrency(data.baseline?.projectedInflow ?? 0))}
          {renderBadge('Projected outflow', formatCurrency(data.baseline?.projectedOutflow ?? 0))}
          {renderBadge('Projected profit', formatCurrency(data.baseline?.projectedProfitability ?? 0), (data.baseline?.projectedProfitability ?? 0) >= 0 ? 'success' : 'danger')}
        </div>
        <div className="ai-section-list">
          {renderListItem('Scenario view', [
            `Reorder multiplier: ${data.scenario?.reorderMultiplier ?? 'N/A'}`,
            `Scenario outflow: ${formatCurrency(data.scenario?.projectedOutflow ?? 0)}`,
            `Scenario profitability: ${formatCurrency(data.scenario?.projectedProfitability ?? 0)}`
          ], 'neutral', 'cash-scenario', navigateToSection)}
        </div>
      </>
    );
  }

  if (sectionKey === 'dataQualityGuardrails') {
    const findings = Array.isArray(data.findings) ? data.findings : [];
    const proposals = Array.isArray(data.fixProposals) ? data.fixProposals : [];
    return (
      <>
        <div className="ai-summary-grid">
          {renderBadge('Findings', data.findingCount ?? 0, (data.findingCount ?? 0) > 0 ? 'warning' : 'success')}
          {renderBadge('Fix proposals', data.fixProposalCount ?? 0)}
        </div>
        <div className="ai-section-list">
          {findings.slice(0, 3).map((item, index) => renderListItem(item.type?.replace(/_/g, ' ') || 'Finding', [
            `Severity: ${item.severity || 'N/A'}`,
            item.message || 'No message available',
            item.suggestedFix ? `Suggested fix: ${item.suggestedFix}` : 'Suggested fix: N/A'
          ], item.severity === 'high' ? 'danger' : 'warning', `finding-${index}-${item.type || 'item'}`, navigateToSection))}
          {proposals.slice(0, 2).map((item, index) => renderListItem(item.type?.replace(/_/g, ' ') || 'Fix proposal', [
            `Target: ${item.targetModel || 'N/A'}`,
            `Field: ${item.fieldPath || 'N/A'}`,
            `Status: ${item.status || 'N/A'}`
          ], 'neutral', `proposal-${index}-${item.type || 'item'}`, navigateToSection))}
        </div>
      </>
    );
  }

  return <div className="ai-empty-state">No preview available for this section.</div>;
};

const AIInsights = ({ showAlert }) => {
  const navigate = useNavigate();
  const { role, hasPermission, loading: roleLoading } = useRole();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [biQuery, setBiQuery] = useState('top 10 low-margin products in last 30 days by warehouse');
  const [biResult, setBiResult] = useState(null);
  const [biLoading, setBiLoading] = useState(false);

  const allowedSections = useMemo(() => {
    if (role === 'businessowner') {
      return sections;
    }

    return sections.filter((section) => section.permissions.every((permission) => hasPermission(permission)));
  }, [hasPermission, role]);

  const effectiveAllowedSections = useMemo(() => {
    const backendAllowedSections = Array.isArray(insights?.allowedSections) ? new Set(insights.allowedSections) : null;
    const filteredSections = !backendAllowedSections
      ? allowedSections
      : allowedSections.filter((section) => backendAllowedSections.has(section.key));

    const desiredOrder = roleSectionOrder[role] || [];
    if (!desiredOrder.length) return filteredSections;

    return [...filteredSections].sort((a, b) => {
      const indexA = desiredOrder.indexOf(a.key);
      const indexB = desiredOrder.indexOf(b.key);
      const safeA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
      const safeB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
      return safeA - safeB;
    });
  }, [allowedSections, insights, role]);

  const effectiveAllowedSectionKeys = useMemo(
    () => new Set(effectiveAllowedSections.map((section) => section.key)),
    [effectiveAllowedSections]
  );

  const visibleSummaryCards = useMemo(() => {
    if (!insights) return [];

    const cards = role === 'supplier' ? supplierSummaryCards : summaryCards;

    return cards
      .filter((card) => effectiveAllowedSectionKeys.has(card.sectionKey))
      .map((card) => ({
        sectionKey: card.sectionKey,
        title: card.title,
        value: card.value(insights),
        subText: card.subText(insights)
      }));
  }, [effectiveAllowedSectionKeys, insights, role]);

  const roleExperience = roleExperienceConfig[role] || roleExperienceConfig.businessowner;

  const canRunBiInsights = role === 'businessowner' || (hasPermission('canViewAnalytics') && hasPermission('canViewProducts'));

  const handleNavigateToInsight = (path) => {
    const normalizedPath = remapPathForRole(normalizeDashboardPath(path), role);
    if (!normalizedPath) return;
    navigate(normalizedPath);
  };

  const handleSectionOpen = (sectionKey, sectionData) => {
    const sectionPath = getInsightTargetPath(sectionKey, role, sectionData);
    handleNavigateToInsight(sectionPath);
  };

  const runAllInsights = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await apiCall('/api/ai/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horizonDays: 45,
          days: 45,
          reorderMultiplier: 1,
          notifyAnomalies: true
        })
      });

      const data = await parseResponse(response);

      if (!response.ok || !data?.success) {
        if (!silent) {
          showAlert?.(data?.error || 'Failed to run AI insights suite.', 'danger');
        }
        return;
      }

      setInsights(data);
      if (!silent) {
        showAlert?.('AI insights generated successfully.', 'success');
      }
    } catch (error) {
      if (!silent) {
        showAlert?.('Network error while generating AI insights.', 'danger');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchLatestInsightsSnapshot = async () => {
    try {
      const response = await apiCall('/api/ai/latest-insights', {
        method: 'GET'
      });

      if (!response.ok) return;

      const data = await parseResponse(response);
      if (data?.success && data?.insights) {
        setInsights(data.insights);
      }
    } catch (error) {
      // Intentionally silent so page remains usable even when polling fails.
    }
  };

  const runBIQuery = async () => {
    if (!biQuery.trim()) {
      showAlert?.('Please enter a BI query.', 'warning');
      return;
    }

    setBiLoading(true);
    try {
      const response = await apiCall('/api/ai/conversational-bi/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: biQuery.trim() })
      });

      const data = await parseResponse(response);
      if (!response.ok || !data?.success) {
        showAlert?.(data?.message || data?.error || 'BI query failed.', 'danger');
        setBiResult(null);
        return;
      }

      setBiResult(data);
      showAlert?.('BI query executed successfully.', 'success');
    } catch (error) {
      showAlert?.('Network error while running BI query.', 'danger');
    } finally {
      setBiLoading(false);
    }
  };

  useEffect(() => {
    if (!role || roleLoading) return;

    fetchLatestInsightsSnapshot();
  }, [role, roleLoading]);

  useEffect(() => {
    if (!role || roleLoading) return undefined;

    const pollTimer = setInterval(() => {
      fetchLatestInsightsSnapshot();
    }, SNAPSHOT_POLL_MS);

    const autoRefreshTimer = setInterval(() => {
      runAllInsights({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => {
      clearInterval(pollTimer);
      clearInterval(autoRefreshTimer);
    };
  }, [role, roleLoading]);

  if (roleLoading) {
    return (
      <div className="ai-insights-page p-3 p-md-4">
        <div className="ai-control-shell d-flex align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
          <div className="spinner-border text-primary" role="status" aria-label="Loading AI Insights permissions" />
        </div>
      </div>
    );
  }

  return (
    <div className="ai-insights-page p-3 p-md-4">
      <div className="ai-control-shell">
      <div className="ai-hero mb-4">
        <div>
          <p className="ai-eyebrow mb-1">AI Control Center</p>
          <h3 className="mb-1 ai-hero-title">{roleExperience.heroTitle}</h3>
          <p className="mb-0 ai-hero-copy">{roleExperience.heroCopy}</p>
        </div>
        <button className="btn ai-primary-btn" onClick={runAllInsights} disabled={loading}>
          {loading ? roleExperience.runningButtonLabel : roleExperience.runButtonLabel}
        </button>
      </div>

      {visibleSummaryCards.length > 0 && (
      <div className="ai-summary-grid-top mb-4">
        {visibleSummaryCards.map((card) => (
          <button
            type="button"
            className="ai-summary-card ai-summary-card-clickable"
            key={card.title}
            onClick={() => handleSectionOpen(card.sectionKey, insights?.[card.sectionKey])}
          >
            <p className="ai-summary-title mb-1">{card.title}</p>
            <h4 className="mb-1">{card.value}</h4>
            <p className="mb-0 ai-summary-subtext">{card.subText}</p>
          </button>
        ))}
      </div>
      )}

      {canRunBiInsights && (
        <div className="ai-section ai-section--bi mb-4">
          <div className="d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between mb-2">
            <h5 className="mb-0">Conversational BI</h5>
            <button className="btn ai-outline-btn" onClick={runBIQuery} disabled={biLoading}>
              {biLoading ? 'Running...' : 'Run Query'}
            </button>
          </div>
          <div className="d-flex flex-column flex-lg-row gap-2">
            <input
              type="text"
              className="form-control"
              value={biQuery}
              onChange={(e) => setBiQuery(e.target.value)}
              placeholder="Ask: top 10 low-margin products in last 30 days by warehouse"
            />
          </div>
          {biResult?.rows?.length > 0 && (
            <div className="table-responsive mt-3">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                    <th>Unit Cost</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {biResult.rows.map((row, index) => (
                    <tr key={`${row.productName}-${row.warehouse}-${index}`}>
                      <td>{row.productName}</td>
                      <td>{row.warehouse}</td>
                      <td>{row.quantitySold}</td>
                      <td>{row.revenue}</td>
                      <td>{row.avgUnitCost}</td>
                      <td>{row.margin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {biResult && (!Array.isArray(biResult.rows) || biResult.rows.length === 0) && (
            <div className="ai-bi-empty-state mt-3">No Data to Show</div>
          )}
        </div>
      )}

      {!canRunBiInsights && (
        <div className="ai-section ai-section--bi mb-4">
          <div className="ai-empty-state">{roleExperience.noBiPermissionMessage}</div>
        </div>
      )}

      <div className="ai-section-grid">
        {effectiveAllowedSections.map((section) => (
          <div className="ai-section" key={section.key}>
            <div className="ai-section-header">
              <div>
                <p className="ai-section-kicker mb-1">Insight</p>
                <h6 className="mb-0">{section.label}</h6>
              </div>
              <button
                type="button"
                className="btn ai-outline-btn ai-section-link-btn"
                onClick={() => handleSectionOpen(section.key, insights?.[section.key])}
              >
                Open related
              </button>
            </div>
            {renderSectionBody(section.key, insights?.[section.key] ?? { status: insightFallback }, role, handleNavigateToInsight)}
          </div>
        ))}
        {effectiveAllowedSections.length === 0 && (
          <div className="ai-section">
            <div className="ai-empty-state">{roleExperience.emptySectionMessage}</div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default AIInsights;
