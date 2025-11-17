import './App.css';
import Login from './components/login/Login';
import SignUp from './components/login/SignUp';
import {useState} from 'react'

import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";
import BusinessOwner from './components/BusinessOwner';
import SideBar from './components/SideBar';
import Alert from './components/Alert';


function App() {
  const [alert, setAlert] = useState(null);
  const showAlert = (message, type) => {
    setAlert({ msg: message, type: type })
    setTimeout(() => {
      setAlert(null);
    }, 1500);
  }
  return (
    <>
    <Alert alert={alert} />
      <Router>
        <div className="container-fluid p-0 m-0">
          <Routes>
            <Route path="/" element={<Login showAlert={showAlert}/>} />
            <Route path="/signup" element={<SignUp showAlert={showAlert}/>} />
            <Route path="/sidebar" element={<SideBar showAlert={showAlert}/>} />
            <Route path="/businessowner" element={<BusinessOwner showAlert={showAlert}/>} />
          </Routes>
        </div>
      </Router>
    </>
  );
}

export default App;
