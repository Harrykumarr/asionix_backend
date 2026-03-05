const User = require('../models/User');

// Simulated in-memory store for OTPs (In a real app, use Redis/DB)
const otpStore = new Map();

exports.register = async (req, res) => {
    try {
        const { username, email, mobile, password, role } = req.body;

        // Ensure either email or mobile is provided
        if (!email && !mobile) {
            return res.status(400).json({ success: false, message: 'Email or mobile is required.' });
        }

        // Check if user already exists
        const query = [];
        if (email) query.push({ email });
        if (mobile) query.push({ mobile });

        const existingUser = await User.findOne({ $or: query });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email or mobile already exists.' });
        }

        const newUser = new User({ username, email, mobile, password, role: role || 'guest' });
        await newUser.save();

        res.status(201).json({ success: true, message: 'User registered successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { role, identifier, password } = req.body;

        const user = await User.findOne({
            role,
            $or: [{ email: identifier }, { mobile: identifier }],
            password
        });

        if (user) {
            return res.status(200).json({
                success: true,
                message: `Successfully logged in as ${user.role}`,
                token: `mock-jwt-token-for-${user._id}`,
                user: { username: user.username, role: user.role }
            });
        }

        return res.status(401).json({ success: false, message: "Invalid credentials or role mismatch." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};

exports.adminLogin = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        const id = identifier ? identifier.trim() : '';
        const pwd = password ? password.trim() : '';

        // Prioritize fixed credentials for admin role
        if (id === process.env.ADMIN_IDENTIFIER && pwd === process.env.ADMIN_PASSWORD) {
            return res.status(200).json({
                success: true,
                message: `Successfully logged in as Admin`,
                token: `mock-jwt-token-for-hardcoded-admin`,
                user: { username: process.env.ADMIN_USERNAME, role: 'admin' }
            });
        }

        // If not fixed credentials, check database for an admin
        const adminUser = await User.findOne({
            role: 'admin',
            $or: [{ email: id }, { mobile: id }],
            password: pwd
        });

        if (adminUser) {
            return res.status(200).json({
                success: true,
                message: `Successfully logged in as Admin`,
                token: `mock-jwt-token-for-${adminUser._id}`,
                user: { username: adminUser.username, role: 'admin' }
            });
        }

        return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during admin login.' });
    }
};

exports.requestOtp = async (req, res) => {
    try {
        const { identifier, type } = req.body;
        const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });

        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with this identifier." });
        }

        // Generate a fixed OTP for demonstration, normally randomized
        const otp = "12345";

        // Store it mapped to the identifier
        otpStore.set(identifier, { otp, type, userId: user._id });

        // Simulate sending time
        setTimeout(() => {
            res.status(200).json({ success: true, message: `OTP sent to ${identifier}` });
        }, 1000);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during OTP request.' });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { identifier, otp } = req.body;
        const storedData = otpStore.get(identifier);

        if (storedData && storedData.otp === otp) {
            const user = await User.findById(storedData.userId);
            if (!user) return res.status(404).json({ success: false, message: "User not found." });

            if (storedData.type === 'forgot_username') {
                otpStore.delete(identifier);
                return res.status(200).json({ success: true, username: user.username });
            } else {
                storedData.verified = true;
                return res.status(200).json({ success: true, message: "Valid OTP. Proceed to reset password." });
            }
        }

        return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during OTP verification.' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { identifier, newPassword } = req.body;
        const storedData = otpStore.get(identifier);

        if (storedData && storedData.verified) {
            const user = await User.findById(storedData.userId);

            if (user) {
                user.password = newPassword;
                await user.save();

                otpStore.delete(identifier);
                return res.status(200).json({ success: true, message: "Password has been successfully reset." });
            }
        }

        return res.status(403).json({ success: false, message: "Unauthorized or session expired. Please verify OTP again." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during password reset.' });
    }
};
