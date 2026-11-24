import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'peerpark-dev-secret';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '30d' },
  );
};

export const register = async (req, res) => {
  try {
    const { full_name, email, password, phone_number, role, cnic_matrix } =
      req.body;

    if (!full_name || !email || !password || !phone_number) {
      return res
        .status(400)
        .json({ message: 'All required fields must be provided.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: 'A user with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const assignedRole = role || 'Driver';

    // Hosts start unverified pending admin audit; drivers are auto-verified
    const is_profile_verified = assignedRole === 'Driver';

    const user = await User.create({
      full_name: full_name.trim(),
      email: normalizedEmail,
      password_hash,
      phone_number: phone_number.trim(),
      role: assignedRole,
      is_profile_verified,
      cnic_matrix: {
        cnic_number: cnic_matrix?.cnic_number || '',
        cnic_front_url: cnic_matrix?.cnic_front_url || '',
        cnic_back_url: cnic_matrix?.cnic_back_url || '',
      },
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        is_profile_verified: user.is_profile_verified,
        cnic_matrix: user.cnic_matrix,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to register user.', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password_hash',
    );
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        is_profile_verified: user.is_profile_verified,
        cnic_matrix: user.cnic_matrix,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to login user.', error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        is_profile_verified: user.is_profile_verified,
        cnic_matrix: user.cnic_matrix,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to fetch profile.', error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { full_name, phone_number, current_password, new_password } =
      req.body;

    const user = await User.findById(req.user._id).select('+password_hash');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (full_name && full_name.trim()) {
      user.full_name = full_name.trim();
    }
    if (phone_number && phone_number.trim()) {
      user.phone_number = phone_number.trim();
    }

    if (new_password) {
      if (!current_password) {
        return res
          .status(400)
          .json({
            message: 'Current password is required to set a new password.',
          });
      }
      if (new_password.length < 6) {
        return res
          .status(400)
          .json({ message: 'New password must be at least 6 characters.' });
      }
      const isMatch = await bcrypt.compare(
        current_password,
        user.password_hash,
      );
      if (!isMatch) {
        return res
          .status(401)
          .json({ message: 'Current password is incorrect.' });
      }
      user.password_hash = await bcrypt.hash(new_password, 10);
    }

    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        is_profile_verified: user.is_profile_verified,
        cnic_matrix: user.cnic_matrix,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to update profile.', error: error.message });
  }
};
