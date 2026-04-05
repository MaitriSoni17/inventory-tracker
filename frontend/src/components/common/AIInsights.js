import { useMemo, useState } from 'react';
import { apiCall, parseResponse } from '../../utils/apiClient';
import '../../styles/ai-insights.css';

const sections = [
  { key: 'demandForecast', label: 'Demand Forecasting' },
  { key: 'autoReorder', label: 'Smart Auto-Reorder' },
  { key: 'anomalyDetection', label: 'Inventory Anomaly Detection' },
  { key: 'supplierIntelligence', label: 'Supplier Intelligence' },
  { key: 'workflowCopilot', label: 'Workflow Copilot' },
  { key: 'prioritizedNotifications', label: 'Notification Prioritization' },
  { key: 'cashAndProfitForecast', label: 'Cash & Profit Forecast' },
  { key: 'dataQualityGuardrails', label: 'Data Quality Guardrails' }
];

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

const renderBadge = (label, value, tone = 'neutral') => (
  <div className={`ai-mini-badge ai-mini-badge-${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const renderListItem = (title, lines, tone = 'neutral', itemKey = title) => (
  <div className={`ai-list-item ai-list-item-${tone}`} key={itemKey}>
    <div className="ai-list-item-title">{title}</div>
    <div className="ai-list-item-body">
      {lines.map((line, index) => (
        <div key={`${itemKey}-${index}`} className="ai-list-line">{line}</div>
      ))}
    </div>
  </div>
);

const renderSectionBody = (sectionKey, data) => {
  if (!data || data.status === insightFallback) {
    return <div className="ai-empty-state">{insightFallback}</div>;
  }

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
          {items.slice(0, 3).map((item, index) => renderListItem(item.productName || 'Unnamed product', [
            `Current stock: ${item.currentStock ?? 0}`,
            `Expected daily demand: ${Number(item.expectedDailyDemand ?? 0).toFixed(2)}`,
            `Recommended reorder: ${item.recommendedReorderQuantity ?? 0}`,
            `Stockout date: ${formatDate(item.expectedStockoutDate)}`
          ], 'warning', `demand-${index}-${item.productName || 'item'}`))}
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
          {plans.slice(0, 3).map((plan, index) => renderListItem(plan.productName || 'Unnamed product', [
            `Reorder qty: ${plan.recommendedReorderQuantity ?? 0}`,
            `Reorder point: ${plan.dynamicReorderPoint ?? 0}`,
            `Estimated cost: ${formatCurrency(plan.estimatedOrderCost ?? 0)}`,
            `Priority: ${plan.deferredByCashConstraint ? 'Deferred by budget' : 'Ready to order'}`
          ], plan.deferredByCashConstraint ? 'warning' : 'success', `reorder-${index}-${plan.productName || 'item'}`))}
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
          ], item.severity === 'high' ? 'danger' : 'warning', `anomaly-${index}-${item.type || 'item'}`))}
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
          ], supplier.score >= 0.75 ? 'success' : supplier.score >= 0.55 ? 'warning' : 'danger', `supplier-${index}-${supplier.supplierName || 'item'}`))}
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
          {suggestions.slice(0, 4).map((item, index) => renderListItem(item.key?.replace(/_/g, ' ') || 'Workflow item', [
            `Priority: ${item.priority || 'N/A'}`,
            item.message || 'No message available',
            `Route: ${item.actionPath || 'N/A'}`
          ], item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'neutral', `workflow-${index}-${item.key || 'item'}`))}
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
          ], item.priorityBand === 'critical' ? 'danger' : item.priorityBand === 'high' ? 'warning' : 'neutral', `notification-${index}-${item.title || 'item'}`))}
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
          ], 'neutral')}
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
          ], item.severity === 'high' ? 'danger' : 'warning', `finding-${index}-${item.type || 'item'}`))}
          {proposals.slice(0, 2).map((item, index) => renderListItem(item.type?.replace(/_/g, ' ') || 'Fix proposal', [
            `Target: ${item.targetModel || 'N/A'}`,
            `Field: ${item.fieldPath || 'N/A'}`,
            `Status: ${item.status || 'N/A'}`
          ], 'neutral', `proposal-${index}-${item.type || 'item'}`))}
        </div>
      </>
    );
  }

  return <div className="ai-empty-state">No preview available for this section.</div>;
};

const AIInsights = ({ showAlert }) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [biQuery, setBiQuery] = useState('top 10 low-margin products in last 30 days by warehouse');
  const [biResult, setBiResult] = useState(null);
  const [biLoading, setBiLoading] = useState(false);

  const summaryCards = useMemo(() => {
    if (!insights) return [];

    return [
      {
        title: 'At Risk Products',
        value: insights?.demandForecast?.atRiskCount ?? 0,
        subText: `${insights?.demandForecast?.totalProductsAnalyzed ?? 0} analyzed`
      },
      {
        title: 'Reorder Plans',
        value: insights?.autoReorder?.reorderCount ?? 0,
        subText: `Budget left: ${insights?.autoReorder?.budgetRemaining ?? 'N/A'}`
      },
      {
        title: 'Anomalies',
        value: insights?.anomalyDetection?.anomalyCount ?? 0,
        subText: 'Potential inventory risks detected'
      },
      {
        title: 'Data Quality Findings',
        value: insights?.dataQualityGuardrails?.findingCount ?? 0,
        subText: `${insights?.dataQualityGuardrails?.fixProposalCount ?? 0} fix proposals created`
      }
    ];
  }, [insights]);

  const runAllInsights = async () => {
    setLoading(true);
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
        showAlert?.(data?.error || 'Failed to run AI insights suite.', 'danger');
        return;
      }

      setInsights(data);
      showAlert?.('AI insights generated successfully.', 'success');
    } catch (error) {
      showAlert?.('Network error while generating AI insights.', 'danger');
    } finally {
      setLoading(false);
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

  return (
    <div className="ai-insights-page p-3 p-md-4">
      <div className="ai-control-shell">
      <div className="ai-hero mb-4">
        <div>
          <p className="ai-eyebrow mb-1">AI Control Center</p>
          <h3 className="mb-1 ai-hero-title">Inventory intelligence in one place</h3>
          <p className="mb-0 ai-hero-copy">Forecast demand, optimize reorders, detect anomalies, and get role-aware daily actions.</p>
        </div>
        <button className="btn ai-primary-btn" onClick={runAllInsights} disabled={loading}>
          {loading ? 'Running AI Suite...' : 'Run Full AI Suite'}
        </button>
      </div>

      <div className="ai-summary-grid-top mb-4">
        {summaryCards.map((card) => (
          <div className="ai-summary-card" key={card.title}>
            <p className="ai-summary-title mb-1">{card.title}</p>
            <h4 className="mb-1">{card.value}</h4>
            <p className="mb-0 ai-summary-subtext">{card.subText}</p>
          </div>
        ))}
      </div>

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

      <div className="ai-section-grid">
        {sections.map((section) => (
          <div className="ai-section" key={section.key}>
            <div className="ai-section-header">
              <div>
                <p className="ai-section-kicker mb-1">Insight</p>
                <h6 className="mb-0">{section.label}</h6>
              </div>
            </div>
            {renderSectionBody(section.key, insights?.[section.key] ?? { status: insightFallback })}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

export default AIInsights;
