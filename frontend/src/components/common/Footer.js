import { useNavigate } from 'react-router-dom';

const Footer = () => {
    const navigate = useNavigate();
    return (
        <>
            {/* Footer */}
            <footer className="footer-elegant">
                <div className="section-container">
                    <div className="footer-content">
                        <div className="footer-section">
                            <h4>Inline Tracker</h4>
                            <p>Smart inventory management for modern businesses.</p>
                        </div>
                        <div className="footer-section">
                            <h4>Quick Links</h4>
                            <ul>
                                <li><button onClick={() => navigate('/features')} className="footer-link">Features</button></li>
                                <li><button onClick={() => navigate('/about')} className="footer-link">About</button></li>
                                <li><button onClick={() => navigate('/contact')} className="footer-link">Contact</button></li>
                            </ul>
                        </div>
                        <div className="footer-section">
                            <h4>Follow Us</h4>
                            <div className="social-links">
                                <button className="social-link me-2" aria-label="Facebook"><i className="bi bi-facebook"></i></button>
                                <button className="social-link me-2" aria-label="Twitter"><i className="bi bi-twitter"></i></button>
                                <button className="social-link me-2" aria-label="LinkedIn"><i className="bi bi-linkedin"></i></button>
                                <button className="social-link" aria-label="Instagram"><i className="bi bi-instagram"></i></button>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2025 Inline Tracker. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </>
    )
}

export default Footer

