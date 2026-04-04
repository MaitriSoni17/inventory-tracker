import { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Import enhanced responsive styles first
import './styles/enhanced-responsive.css';
import './styles/charts.css';
import './App.css';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SideBar from './components/common/SideBar';
import Alert from './components/common/Alert';
import { RoleProvider } from './context/RoleContext';
import { PermissionRouteGuard, RoleRouteGuard } from './components/auth/RouteGuard';
import DashboardGuard from './components/auth/DashboardGuard';

const Home = lazy(() => import('./components/landing/Home'));
const Features = lazy(() => import('./components/landing/Features'));
const About = lazy(() => import('./components/landing/About'));
const Contact = lazy(() => import('./components/landing/Contact'));
const Login = lazy(() => import('./components/auth/Login'));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword'));
const SignUp = lazy(() => import('./components/auth/SignUp'));
const SupplierOrders = lazy(() => import('./components/dashboard/Supplier/SupplierOrders'));
const SupplierOrderDetail = lazy(() => import('./components/dashboard/Supplier/SupplierOrderDetail'));
const SupplierSettings = lazy(() => import('./components/dashboard/Supplier/Settings'));
const CreateEmployee = lazy(() => import('./components/dashboard/BusinessOwner/CreateEmployee'));
const CreateSupplier = lazy(() => import('./components/dashboard/BusinessOwner/CreateSupplier'));
const Category = lazy(() => import('./components/dashboard/BusinessOwner/Category'));
const Products = lazy(() => import('./components/dashboard/BusinessOwner/Products'));
const AddProduct = lazy(() => import('./components/dashboard/BusinessOwner/AddProduct'));
const EditProduct = lazy(() => import('./components/dashboard/BusinessOwner/EditProduct'));
const Orders = lazy(() => import('./components/dashboard/BusinessOwner/Orders'));
const AddOrder = lazy(() => import('./components/dashboard/BusinessOwner/AddOrder'));
const EditOrder = lazy(() => import('./components/dashboard/BusinessOwner/EditOrder'));
const Employees = lazy(() => import('./components/dashboard/BusinessOwner/Employees'));
const EditEmployee = lazy(() => import('./components/dashboard/BusinessOwner/EditEmployee'));
const Suppliers = lazy(() => import('./components/dashboard/BusinessOwner/Suppliers'));
const EditSupplier = lazy(() => import('./components/dashboard/BusinessOwner/EditSupplier'));
const SupplierOrder = lazy(() => import('./components/dashboard/BusinessOwner/SupplierOrder'));
const AddSupplierOrder = lazy(() => import('./components/dashboard/BusinessOwner/AddSupplierOrder'));
const EditSupplierOrder = lazy(() => import('./components/dashboard/BusinessOwner/EditSupplierOrder'));
const Warehouses = lazy(() => import('./components/dashboard/BusinessOwner/Warehouses'));
const WarehouseDetails = lazy(() => import('./components/dashboard/BusinessOwner/WarehouseDetails'));
const ProductDetails = lazy(() => import('./components/dashboard/BusinessOwner/ProductDetails'));
const Settings = lazy(() => import('./components/dashboard/BusinessOwner/Settings'));
const EmpSettings = lazy(() => import('./components/dashboard/Employee/Settings'));
const NotificationsPage = lazy(() => import('./components/common/NotificationsPage'));
const Messaging = lazy(() => import('./components/common/Messaging'));
const PermissionManager = lazy(() => import('./components/dashboard/BusinessOwner/PermissionManager'));
const Reports = lazy(() => import('./components/common/Reports'));
const AIInsights = lazy(() => import('./components/common/AIInsights'));
const SalaryManagement = lazy(() => import('./components/dashboard/BusinessOwner/SalaryManagement'));
const AccessDenied = lazy(() => import('./components/common/AccessDenied'));
const DeletionRestriction = lazy(() => import('./components/common/DeletionRestriction'));

const RouteLoadingFallback = () => (
  <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '40vh' }}>
    <div className="spinner-border text-primary" role="status" aria-label="Loading route content" />
  </div>
);

function App() {
  const [alert, setAlert] = useState(null);
  const showAlert = (message, type) => {
    setAlert({ msg: message, type: type });
    setTimeout(() => setAlert(null), 1500);
  };

  return (
    <RoleProvider>
      <>
        <Alert alert={alert} />
        <Router>
          <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Landing Pages */}
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Auth Pages */}
            <Route path="/login" element={<Login showAlert={showAlert} />} />
            <Route path="/forgot-password" element={<ForgotPassword showAlert={showAlert} />} />
            <Route path="/reset-password" element={<ResetPassword showAlert={showAlert} />} />
            <Route path="/signup" element={<SignUp showAlert={showAlert} />} />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <SideBar showAlert={showAlert} />
              </ProtectedRoute>
              }>
              {/* Default dashboard view based on role */}
              <Route index element={
                <DashboardGuard showAlert={showAlert} />
              } />

              {/* Supplier Orders (Supplier view) */}
              <Route path="suppliersorders" element={
                <RoleRouteGuard roles="supplier">
                  <SupplierOrders showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              <Route path="supplierorderdetail/:id" element={
                <RoleRouteGuard roles="supplier">
                  <SupplierOrderDetail showAlert={showAlert} />
                </RoleRouteGuard>
              } />

              {/* Employee pages - requires canViewEmployees */}
              <Route path="employee" element={
                <PermissionRouteGuard permission="canViewEmployees">
                  <Employees showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              <Route path="createemployee" element={
                <PermissionRouteGuard permission="canManageEmployees">
                  <CreateEmployee showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              <Route path="editemployee/:id" element={
                <PermissionRouteGuard permission="canViewEmployees">
                  <EditEmployee showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              {/* Supplier management - Business Owner only */}
              <Route path="suppliers" element={
                <RoleRouteGuard roles="businessowner">
                  <Suppliers showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              <Route path="createsupplier" element={
                <RoleRouteGuard roles="businessowner">
                  <CreateSupplier showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              <Route path="editsupplier/:id" element={
                <RoleRouteGuard roles="businessowner">
                  <EditSupplier showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              <Route path="supplierordes/:id" element={
                <RoleRouteGuard roles="businessowner">
                  <SupplierOrder showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              <Route path="addsupplierorder/:id" element={
                <RoleRouteGuard roles="businessowner">
                  <AddSupplierOrder showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              <Route path="editsupplierorder/:id" element={
                <RoleRouteGuard roles="businessowner">
                  <EditSupplierOrder showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              {/* Categories - requires canViewCategories */}
              <Route path="category" element={
                <PermissionRouteGuard permission="canViewCategories">
                  <Category showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              {/* Products - requires canViewProducts */}
              <Route path="products" element={
                <PermissionRouteGuard permission="canViewProducts">
                  <Products showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              <Route path="addproduct" element={
                <PermissionRouteGuard permission="canCreateProducts">
                  <AddProduct showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              <Route path="editproduct/:id" element={
                <PermissionRouteGuard permission="canEditProducts">
                  <EditProduct showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              {/* Orders - requires canViewOrders */}
              <Route path="orders" element={
                <PermissionRouteGuard permission="canViewOrders">
                  <Orders showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              <Route path="addorder" element={
                <PermissionRouteGuard permission="canCreateOrders">
                  <AddOrder showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              <Route path="editorder/:id" element={
                <PermissionRouteGuard permission="canEditOrders">
                  <EditOrder showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              {/* Warehouses - requires canViewWarehouses */}
              <Route path="warehouses" element={
                <PermissionRouteGuard permission="canViewWarehouses">
                  <Warehouses showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              <Route path="warehouses/:id" element={
                <PermissionRouteGuard permission="canViewWarehouses">
                  <WarehouseDetails showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              <Route path="product/:id" element={
                <PermissionRouteGuard permission="canViewProducts">
                  <ProductDetails showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              {/* Settings - Business Owner only */}
              <Route path="settings" element={
                <RoleRouteGuard roles="businessowner">
                  <Settings showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              {/* Notifications - requires canViewNotifications */}
              <Route path="notifications" element={
                <PermissionRouteGuard permission="canViewNotifications">
                  <NotificationsPage showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              {/* Messages - requires canViewMessages */}
              <Route path="messages" element={
                <PermissionRouteGuard permission="canViewMessages">
                  <Messaging />
                </PermissionRouteGuard>
              } />
              {/* Permissions - Business Owner only */}
              <Route path="permissions" element={
                <RoleRouteGuard roles="businessowner">
                  <PermissionManager showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              {/* Reports - requires canExportReports */}
              <Route path="reports" element={
                <PermissionRouteGuard permission="canExportReports">
                  <Reports showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              <Route path="ai-insights" element={
                <PermissionRouteGuard permission="canExportReports">
                  <AIInsights showAlert={showAlert} />
                </PermissionRouteGuard>
              } />
              {/* Salary Management - Business Owner only */}
              <Route path="salary" element={
                <RoleRouteGuard roles="businessowner">
                  <SalaryManagement showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              
              {/* Employee Settings - Employees only */}
              <Route path="empsettings" element={
                <RoleRouteGuard roles={['employee', 'supervisor', 'manager']} allowCustomRoles={true}>
                  <EmpSettings showAlert={showAlert} />
                </RoleRouteGuard>
              } />
              {/* Supplier Settings - Supplier only */}
              <Route path="suppliersettings" element={
                <RoleRouteGuard roles="supplier">
                  <SupplierSettings showAlert={showAlert} />
                </RoleRouteGuard>
              } />

              {/* Deletion grace hold for approved employee/supplier deletion requests */}
              <Route path="deletion-hold" element={<DeletionRestriction showAlert={showAlert} />} />

              {/* Catch-all for unmatched dashboard routes */}
              <Route path="*" element={<AccessDenied message="The page you're looking for doesn't exist or you don't have permission to access it." />} />
            </Route>

          </Routes>
          </Suspense>
        </Router>
      </>
    </RoleProvider>
  );
}

export default App;

