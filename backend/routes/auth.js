const express = require('express');
const BusinessOwner = require('../models/BusinessOwner');
const router = express.Router();

const { body, validationResult } = require('express-validator');

// Create a user using: POST "/api/auth/createbusinessowner". No login required

router.post('/createbusinessowner', [
    body('fname', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be atleast 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        let businessowner = await BusinessOwner.findOne({ email: req.body.email });
        if (businessowner) {
            return res.status(400).json({ error: "Sorry a user with this email already exists" });
        }
        businessowner = await BusinessOwner.create({
            fname: req.body.fname,
            lname: req.body.lname,
            email: req.body.email,
            password: req.body.password,
            phone: req.body.phone,
            address: req.body.address
        })
        // .then(user => res.json(user)).catch(err => {
        //     console.log(err);
        //     res.json({ error: 'Please enter a unique value for email', message: err.message });
        // });
        // res.send(req.body);
        res.json(businessowner);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send("Some error occurred");
    }
});

module.exports = router;