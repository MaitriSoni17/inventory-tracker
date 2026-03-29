const express = require('express');
const BusinessOwner = require('../models/BusinessOwner');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const LoginInfo = require('../models/LoginInfo')
const fetchuser = require('../middleware/fetchuser');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const fetchbusinessowner = require('../middleware/fetchbusinessowner');
const { body, validationResult } = require('express-validator');
const { notifyBusinessOwnerAboutEmployeeLogin, notifyBusinessOwnerAboutSupplierLogin } = require('../utils/notificationHelper');
const { sendPasswordResetEmail, isMailConfigured } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'ThisisaSecretKey';
const PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET || JWT_SECRET;
const PASSWORD_RESET_EXPIRES_IN = process.env.PASSWORD_RESET_EXPIRES_IN || '15m';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const getAccountByEmail = async (email) => {
    const businessOwner = await BusinessOwner.findOne({ email });
    if (businessOwner) {
        return { accountType: 'businessowner', user: businessOwner };
    }

    const employee = await Employee.findOne({ email });
    if (employee) {
        return { accountType: 'employee', user: employee };
    }

    const supplier = await Supplier.findOne({ email });
    if (supplier) {
        return { accountType: 'supplier', user: supplier };
    }

    return null;
};

const getModelByAccountType = (accountType) => {
    if (accountType === 'businessowner') return BusinessOwner;
    if (accountType === 'employee') return Employee;
    if (accountType === 'supplier') return Supplier;
    return null;
};


// Login for any user (Business Owner, Employee, Supplier) using: POST "/api/auth/login". No login required

router.post('/login', [
    body('email', 'Enter a valid email').trim().isEmail(),
    body('password', 'Password cannot be blank').notEmpty(),
], async (req, res) => {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    req.body.email = normalizedEmail;
    req.body.password = password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        let user = await BusinessOwner.findOne({ email: normalizedEmail });
        let role = 'businessowner';

        if (!user) {
            user = await Employee.findOne({ email: normalizedEmail });
            if (user) {
                role = user.role || 'employee'; // Use employee's actual role (built-in or custom)
            }
        }

        if (!user) {
            user = await Supplier.findOne({ email: normalizedEmail });
            role = 'supplier';
        }

        if (!user) return res.status(400).json({ error: "Please try to login with correct credentials" });

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) return res.status(400).json({ error: "Please try to login with correct credentials" });

        // Check if employee or supplier is deactivated
        if (role !== 'businessowner' && user.isActive === false) {
            return res.status(403).json({ 
                success: false,
                error: "Your account has been deactivated by your business owner.",
                code: "ACCOUNT_DEACTIVATED",
                message: "Please contact your business owner to reactivate your account.",
                userEmail: user.email,
                userRole: role
            });
        }

        // Business owner can reactivate their account by logging in again.
        let reactivated = false;
        if (role === 'businessowner' && user.active === false) {
            user.active = true;
            await user.save();
            reactivated = true;
        }

        const tokenVersion = Number.isInteger(user.tokenVersion) ? user.tokenVersion : 0;
        const token = jwt.sign({ id: user._id, role, tokenVersion }, JWT_SECRET);
        const loginTime = new Date();

        // Update lastLogin timestamp — check if user is an employee-type role (not businessowner or supplier)
        if (role !== 'businessowner' && role !== 'supplier') {
            await Employee.findByIdAndUpdate(user._id, { lastLogin: loginTime });
            // Notify business owner about employee login
            await notifyBusinessOwnerAboutEmployeeLogin(
                user.businessowner,
                user._id,
                `${user.fname} ${user.lname || ''}`,
                loginTime,
                { userId: user._id }
            );
        } else if (role === 'supplier') {
            await Supplier.findByIdAndUpdate(user._id, { lastLogin: loginTime });
            // Notify business owner about supplier login
            await notifyBusinessOwnerAboutSupplierLogin(
                user.businessowner,
                user._id,
                user.fname,
                loginTime,
                { supplierId: user._id }
            );
        }

        await LoginInfo.create(
            {
                email: normalizedEmail,
                role
            }
        )

        res.json({
            success: true,
            authtoken: token,
            role: role,
            userId: user._id.toString(),
            reactivated,
            mustChangePassword: Boolean(user.mustChangePassword)
        });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

// Start employee impersonation: POST "/api/auth/impersonate/employee/:employeeId". Business Owner login required
router.post('/impersonate/employee/:employeeId', fetchbusinessowner, async (req, res) => {
    try {
        const { employeeId } = req.params;

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }

        if (employee.businessowner.toString() !== req.businessowner._id.toString()) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const tokenVersion = Number.isInteger(employee.tokenVersion) ? employee.tokenVersion : 0;
        const impersonationToken = jwt.sign(
            {
                id: employee._id,
                role: employee.role || 'employee',
                tokenVersion,
                isImpersonation: true,
                impersonatedBy: req.businessowner._id,
                impersonatorRole: 'businessowner'
            },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        await LoginInfo.create({
            email: req.businessowner.email,
            role: 'impersonation_start'
        });

        return res.json({
            success: true,
            authtoken: impersonationToken,
            role: employee.role || 'employee',
            userId: employee._id.toString(),
            isImpersonation: true,
            impersonatedEmployee: {
                _id: employee._id,
                name: `${employee.fname || ''} ${employee.lname || ''}`.trim() || employee.email,
                email: employee.email
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Internal Server error occurred' });
    }
});

// Stop impersonation: POST "/api/auth/stop-impersonation". Impersonated session token required
router.post('/stop-impersonation', async (req, res) => {
    try {
        const token = req.header('auth-token');
        if (!token) {
            return res.status(401).json({ success: false, error: 'Please authenticate using a valid token' });
        }

        const data = jwt.verify(token, JWT_SECRET);
        if (!data.isImpersonation || !data.impersonatedBy) {
            return res.status(400).json({ success: false, error: 'No active impersonation session found' });
        }

        const businessowner = await BusinessOwner.findById(data.impersonatedBy);
        if (!businessowner) {
            return res.status(404).json({ success: false, error: 'Business owner not found' });
        }

        if (businessowner.active === false) {
            return res.status(403).json({ success: false, error: 'Business owner account is deactivated' });
        }

        const ownerToken = jwt.sign({ id: businessowner._id, role: 'businessowner' }, JWT_SECRET);

        await LoginInfo.create({
            email: businessowner.email,
            role: 'impersonation_stop'
        });

        return res.json({
            success: true,
            authtoken: ownerToken,
            role: 'businessowner',
            userId: businessowner._id.toString(),
            isImpersonation: false
        });
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

// Forgot password request: POST "/api/auth/forgot-password". No login required.
router.post('/forgot-password', [
    body('email', 'Enter a valid email').trim().isEmail()
], async (req, res) => {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    req.body.email = normalizedEmail;

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const account = await getAccountByEmail(normalizedEmail);

        // Keep response identical for unknown emails to avoid account enumeration.
        if (!account) {
            return res.json({
                success: true,
                message: 'If an account exists for this email, password reset instructions will be sent.'
            });
        }

        const resetToken = jwt.sign(
            {
                id: account.user._id.toString(),
                accountType: account.accountType,
                purpose: 'password_reset'
            },
            PASSWORD_RESET_SECRET,
            { expiresIn: PASSWORD_RESET_EXPIRES_IN }
        );

        const cleanFrontendUrl = FRONTEND_URL.replace(/\/$/, '');
        const resetLink = `${cleanFrontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

        if (!isMailConfigured() && process.env.NODE_ENV === 'production') {
            return res.status(500).json({
                error: 'Email service is not configured on server. Please contact support.'
            });
        }

        const receiverName = `${account.user.fname || ''} ${account.user.lname || ''}`.trim() || 'User';
        const mailResult = await sendPasswordResetEmail({
            to: account.user.email,
            receiverName,
            resetLink
        });

        if (mailResult.mode === 'test') {
            return res.json({
                success: true,
                message: 'SMTP not configured. Email sent via development test inbox.',
                previewUrl: mailResult.previewUrl,
                resetLink
            });
        }

        if (!isMailConfigured()) {
            // Development fallback: allow local password reset testing without SMTP.
            if (process.env.NODE_ENV !== 'production') {
                return res.json({
                    success: true,
                    message: 'Email service is not configured. Use the development reset link below.',
                    resetLink
                });
            }

            return res.status(500).json({
                error: 'Email service is not configured on server. Please contact support.'
            });
        }

        return res.json({
            success: true,
            message: 'If an account exists for this email, password reset instructions will be sent.'
        });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Forgot password error:', err.message);
        return res.status(500).json({ error: 'Unable to send reset email right now. Please try again later.' });
    }
});

// Reset password via secure token: POST "/api/auth/reset-password". No login required.
router.post('/reset-password', [
    body('token', 'Reset token is required').trim().notEmpty(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    body('confirmPassword', 'Confirm password is required').trim().notEmpty()
], async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    try {
        const payload = jwt.verify(token, PASSWORD_RESET_SECRET);

        if (payload.purpose !== 'password_reset' || !payload.id || !payload.accountType) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const Model = getModelByAccountType(payload.accountType);
        if (!Model) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const user = await Model.findById(payload.id);
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        return res.json({ success: true, message: 'Password reset successful. You can now log in.' });
    } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
});

// Get current user info using JWT token: GET "/api/auth/getuser"
router.get('/getuser', fetchuser, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not found" });
        }
        res.json({
            _id: req.user._id,
            email: req.user.email,
            fname: req.user.fname,
            lname: req.user.lname,
            role: req.role
        });
    } catch (err) {
        res.status(500).json({ error: "Internal Server error occurred" });
    }
});

module.exports = router;