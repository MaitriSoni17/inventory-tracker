import './App.css';
import Login from './components/login/Login';
import SignUp from './components/login/SignUp';

import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";

function App() {
  return (
    <>
      <Router>
        <div className="container-fluid p-0 m-0">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
          </Routes>
        </div>
      </Router>
    </>
  );
}

export default App;
