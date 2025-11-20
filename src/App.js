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
            <Route path="createemployee" element={<CreateEmployee showAlert={showAlert} />} />
            <Route path="createsupplier" element={<CreateSupplier showAlert={showAlert} />} />
          </Route>

        </Routes>
      </Router>
    </>
  );
}

export default App;