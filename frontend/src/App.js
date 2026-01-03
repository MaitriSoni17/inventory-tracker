import React, { useState } from "react";
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
import BusinessOwner from './components/dashboard/BusinessOwner';
import Employee from './components/dashboard/Employee';
import Supplier from './components/dashboard/Supplier';
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
import { RoleProvider } from './context/RoleContext';

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
                localStorage.getItem('role') === 'businessowner' ? <BusinessOwner showAlert={showAlert} /> :
                 localStorage.getItem('role') === 'employee' || localStorage.getItem('role') === 'supervisor' || localStorage.getItem('role') === 'manager' ? <Employee showAlert={showAlert} /> :
                    <Supplier showAlert={showAlert} />
              } />

              {/* Supplier Orders */}
              <Route path="suppliersorders" element={<SupplierOrders showAlert={showAlert} />} />
              <Route path="supplierorderdetail/:id" element={<SupplierOrderDetail showAlert={showAlert} />} />

              {/* Other nested pages */}
              <Route path="employee" element={<Employees showAlert={showAlert} />} />
              <Route path="createemployee" element={<CreateEmployee showAlert={showAlert} />} />
              <Route path="editemployee/:id" element={<EditEmployee showAlert={showAlert} />} />
              <Route path="suppliers" element={<Suppliers showAlert={showAlert} />} />
              <Route path="createsupplier" element={<CreateSupplier showAlert={showAlert} />} />
              <Route path="editsupplier/:id" element={<EditSupplier showAlert={showAlert} />} />
              <Route path="supplierordes/:id" element={<SupplierOrder showAlert={showAlert} />} />
              <Route path="addsupplierorder/:id" element={<AddSupplierOrder showAlert={showAlert} />} />
              <Route path="editsupplierorder/:id" element={<EditSupplierOrder showAlert={showAlert} />} />
              <Route path="category" element={<Category showAlert={showAlert} />} />
              <Route path="products" element={<Products showAlert={showAlert} />} />
              <Route path="addproduct" element={<AddProduct showAlert={showAlert} />} />
              <Route path="editproduct/:id" element={<EditProduct showAlert={showAlert} />} />
              <Route path="orders" element={<Orders showAlert={showAlert} />} />
              <Route path="addorder" element={<AddOrder showAlert={showAlert} />} />
              <Route path="editorder/:id" element={<EditOrder showAlert={showAlert} />} />
              <Route path="warehouses" element={<Warehouses showAlert={showAlert} />} />
              <Route path="settings" element={<Settings showAlert={showAlert} />} />
              <Route path="notifications" element={<NotificationsPage showAlert={showAlert} />} />
              
              <Route path="empsettings" element={<EmpSettings showAlert={showAlert} />} />
              <Route path="suppliersettings" element={<SupplierSettings showAlert={showAlert} />} />
            </Route>

          </Routes>
        </Router>
      </>
    </RoleProvider>
  );
}

export default App;

