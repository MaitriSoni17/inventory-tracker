import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from './components/login/Login';
import SignUp from './components/login/SignUp';
import SideBar from './components/SideBar';
import BusinessOwner from './components/BusinessOwner';
import Employee from './components/Employee';
import Supplier from './components/Supplier';
import CreateEmployee from './components/BusinessOwner/CreateEmployee';
import Alert from './components/Alert';
import CreateSupplier from "./components/BusinessOwner/CreateSupplier";
import Category from "./components/BusinessOwner/Category";
import Products from "./components/BusinessOwner/Products";
import AddProduct from "./components/BusinessOwner/AddProduct";
import EditProduct from "./components/BusinessOwner/EditProduct";
import Orders from "./components/BusinessOwner/Orders";
import AddOrder from "./components/BusinessOwner/AddOrder";
import EditOrder from "./components/BusinessOwner/EditOrder";
import Employees from "./components/BusinessOwner/Employees";
import EditEmployee from "./components/BusinessOwner/EditEmployee";
import Suppliers from "./components/BusinessOwner/Suppliers";
import EditSupplier from "./components/BusinessOwner/EditSupplier";

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
          <Route path="/" element={<Login showAlert={showAlert} />} />
          <Route path="/signup" element={<SignUp showAlert={showAlert} />} />

          <Route path="/dashboard" element={<SideBar showAlert={showAlert} />}>
            {/* Default dashboard view based on role */}
            <Route index element={
              localStorage.getItem('role') === 'businessowner' ? <BusinessOwner showAlert={showAlert} /> :
               localStorage.getItem('role') === 'employee' ? <Employee showAlert={showAlert} /> :
                  <Supplier showAlert={showAlert} />
            } />

            {/* Other nested pages */}
            <Route path="employee" element={<Employees showAlert={showAlert} />} />
            <Route path="createemployee" element={<CreateEmployee showAlert={showAlert} />} />
            <Route path="editemployee/:id" element={<EditEmployee showAlert={showAlert} />} />
            <Route path="suppliers" element={<Suppliers showAlert={showAlert} />} />
            <Route path="createsupplier" element={<CreateSupplier showAlert={showAlert} />} />
            <Route path="editsupplier/:id" element={<EditSupplier showAlert={showAlert} />} />
            <Route path="category" element={<Category showAlert={showAlert} />} />
            <Route path="products" element={<Products showAlert={showAlert} />} />
            <Route path="addproduct" element={<AddProduct showAlert={showAlert} />} />
            <Route path="editproduct/:id" element={<EditProduct showAlert={showAlert} />} />
            <Route path="orders" element={<Orders showAlert={showAlert} />} />
            <Route path="addorder" element={<AddOrder showAlert={showAlert} />} />
            <Route path="editorder/:id" element={<EditOrder showAlert={showAlert} />} />
          </Route>

        </Routes>
      </Router>
    </>
  );
}

export default App;