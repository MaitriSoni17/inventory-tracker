import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Import enhanced responsive styles first
import './styles/enhanced-responsive.css';
import './App.css';
import Home from './components/landing/Home';
import Features from './components/landing/Features';
import About from './components/landing/About';
import Contact from './components/landing/Contact';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SideBar from './components/common/SideBar';
import SupplierOrders from './components/dashboard/Supplier/SupplierOrders';
import SupplierOrderDetail from './components/dashboard/Supplier/SupplierOrderDetail';
import SupplierSettings from './components/dashboard/Supplier/Settings';
import CreateEmployee from './components/dashboard/BusinessOwner/CreateEmployee';
import Alert from './components/common/Alert';
import CreateSupplier from './components/dashboard/BusinessOwner/CreateSupplier';
import Category from './components/dashboard/BusinessOwner/Category';
import Products from './components/dashboard/BusinessOwner/Products';
import AddProduct from './components/dashboard/BusinessOwner/AddProduct';
import EditProduct from './components/dashboard/BusinessOwner/EditProduct';
import Orders from './components/dashboard/BusinessOwner/Orders';
import AddOrder from './components/dashboard/BusinessOwner/AddOrder';
import EditOrder from './components/dashboard/BusinessOwner/EditOrder';
import Employees from './components/dashboard/BusinessOwner/Employees';
import EditEmployee from './components/dashboard/BusinessOwner/EditEmployee';
import Suppliers from './components/dashboard/BusinessOwner/Suppliers';
import EditSupplier from './components/dashboard/BusinessOwner/EditSupplier';
import SupplierOrder from './components/dashboard/BusinessOwner/SupplierOrder';
import AddSupplierOrder from './components/dashboard/BusinessOwner/AddSupplierOrder';
import EditSupplierOrder from './components/dashboard/BusinessOwner/EditSupplierOrder';
import Warehouses from './components/dashboard/BusinessOwner/Warehouses';
import Settings from './components/dashboard/BusinessOwner/Settings';
import EmpSettings from './components/dashboard/Employee/Settings';
import NotificationsPage from './components/common/NotificationsPage';
import Messaging from './components/common/Messaging';
import PermissionManager from './components/dashboard/BusinessOwner/PermissionManager';
import Reports from './components/common/Reports';
import SalaryManagement from './components/dashboard/BusinessOwner/SalaryManagement';
import { RoleProvider } from './context/RoleContext';
import { PermissionRouteGuard, RoleRouteGuard } from './components/auth/RouteGuard';
import AccessDenied from './components/common/AccessDenied';
import DashboardGuard from './components/auth/DashboardGuard';

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
          <Routes>
            {/* Landing Pages */}
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Auth Pages */}
            <Route path="/login" element={<Login showAlert={showAlert} />} />
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

              {/* Catch-all for unmatched dashboard routes */}
              <Route path="*" element={<AccessDenied message="The page you're looking for doesn't exist or you don't have permission to access it." />} />
            </Route>

          </Routes>
        </Router>
      </>
    </RoleProvider>
  );
}

export default App;

