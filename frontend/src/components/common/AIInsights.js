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
      <div className="ai-hero mb-4">
        <div>
          <h3 className="mb-1">AI Control Center</h3>
          <p className="mb-0">Forecast demand, optimize reorders, detect anomalies, and get role-aware daily actions.</p>
        </div>
        <button className="btn btn-primary" onClick={runAllInsights} disabled={loading}>
          {loading ? 'Running AI Suite...' : 'Run Full AI Suite'}
        </button>
      </div>

      <div className="row g-3 mb-4">
        {summaryCards.map((card) => (
          <div className="col-12 col-sm-6 col-xl-3" key={card.title}>
            <div className="ai-summary-card">
              <p className="ai-summary-title mb-1">{card.title}</p>
              <h4 className="mb-1">{card.value}</h4>
              <p className="mb-0 ai-summary-subtext">{card.subText}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="ai-section mb-4">
        <div className="d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between mb-2">
          <h5 className="mb-0">Conversational BI</h5>
          <button className="btn btn-outline-primary" onClick={runBIQuery} disabled={biLoading}>
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
      </div>

      <div className="row g-3">
        {sections.map((section) => (
          <div className="col-12 col-lg-6" key={section.key}>
            <div className="ai-section">
              <h6 className="mb-2">{section.label}</h6>
              <pre className="ai-json-preview mb-0">
                {JSON.stringify(insights?.[section.key] ?? { status: 'Run Full AI Suite to populate this section.' }, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIInsights;
