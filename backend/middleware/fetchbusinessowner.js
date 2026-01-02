const jwt = require('jsonwebtoken');
const BusinessOwner = require('../models/BusinessOwner');
const JWT_SECRET = process.env.JWT_SECRET || "ThisisaSecretKey";

const fetchbusinessowner = async (req, res, next) => {
    try {
        const token = req.header('auth-token');
        
        // Log the request
        // console.log('fetchbusinessowner middleware: Received request');
        // console.log('Token present:', !!token);
        
        if (!token) {
            console.error('No auth-token header found');
            return res.status(401).json({ 
                success: false,
                error: "Please authenticate using a valid token" 
            });
        }

        // console.log('Verifying token...');
        const data = jwt.verify(token, JWT_SECRET);
        
        if (!data.id) {
            console.error('No id in token');
            return res.status(401).json({ 
                success: false,
                error: "Invalid token structure" 
            });
        }
        
        // console.log('Token verified, looking up business owner:', data.id);
        const businessowner = await BusinessOwner.findById(data.id);
        
        if (!businessowner) {
            console.error('Business owner not found for id:', data.id);
            return res.status(401).json({ 
                success: false,
                error: "Business owner not found" 
            });
        }
        
        // console.log('Business owner found:', { 
        //     _id: businessowner._id.toString(), 
        //     email: businessowner.email,
        //     hasEmail: !!businessowner.email,
        //     allFields: Object.keys(businessowner.toObject())
        // });
        req.businessowner = businessowner;
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        console.error('Error stack:', error.stack);
        res.status(401).json({ 
            success: false,
            error: "Invalid token", 
            details: error.message 
        });
    }
};

module.exports = fetchbusinessowner;

