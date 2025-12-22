import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './components/Home';
import Features from './components/Features';
import About from './components/About';
import Contact from './components/Contact';
import Login from './components/login/Login';
import SignUp from './components/login/SignUp';
import SideBar from './components/SideBar';
import BusinessOwner from './components/BusinessOwner';
import Employee from './components/Employee';
import Supplier from './components/Supplier';
import SupplierOrders from './components/Supplier/SupplierOrders';
import SupplierOrderDetail from './components/Supplier/SupplierOrderDetail';
import SupplierSettings from './components/Supplier/Settings';
import CreateEmployee from './components/BusinessOwner/CreateEmployee';
import Alert from './components/Alert';
import CreateSupplier from './components/BusinessOwner/CreateSupplier';
import Category from './components/BusinessOwner/Category';
import Products from './components/BusinessOwner/Products';
import AddProduct from './components/BusinessOwner/AddProduct';
import EditProduct from './components/BusinessOwner/EditProduct';
import Orders from './components/BusinessOwner/Orders';
import AddOrder from './components/BusinessOwner/AddOrder';
import EditOrder from './components/BusinessOwner/EditOrder';
import Employees from './components/BusinessOwner/Employees';
import EditEmployee from './components/BusinessOwner/EditEmployee';
import Suppliers from './components/BusinessOwner/Suppliers';
import EditSupplier from './components/BusinessOwner/EditSupplier';
import SupplierOrder from './components/BusinessOwner/SupplierOrder';
import AddSupplierOrder from './components/BusinessOwner/AddSupplierOrder';
import EditSupplierOrder from './components/BusinessOwner/EditSupplierOrder';
import Warehouses from './components/BusinessOwner/Warehouses';
import Settings from './components/BusinessOwner/Settings';
import EmpSettings from './components/Employee/Settings';
import NotificationsPage from './components/NotificationsPage';

function App() {
  const [alert, setAlert] = useState(null);
  const showAlert = (message, type) => {
    setAlert({ msg: message, type: type });
    setTimeout(() => setAlert(null), 1500);
  };

  return (
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

          <Route path="/dashboard" element={<SideBar showAlert={showAlert} />}>
            {/* Default dashboard view based on role */}
            <Route index element={
              localStorage.getItem('role') === 'businessowner' ? <BusinessOwner showAlert={showAlert} /> :
               localStorage.getItem('role') === 'employee' ? <Employee showAlert={showAlert} /> :
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
  );
}

export default App;