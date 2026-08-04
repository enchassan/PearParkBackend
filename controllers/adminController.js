import User from '../models/User.js';
import Spot from '../models/Spot.js';

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('full_name email phone_number role is_profile_verified cnic_matrix');

    return res.status(200).json({ message: 'Users fetched successfully.', users });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users.', error: error.message });
  }
};

export const getVerifications = async (req, res) => {
  try {
    const users = await User.find({
      is_profile_verified: false,
    }).select('full_name email phone_number cnic_matrix role');

    return res.status(200).json({ message: 'Verification queue fetched successfully.', users });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch verification queue.', error: error.message });
  }
};

export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.is_profile_verified = true;
    await user.save();

    return res.status(200).json({ message: 'User profile approved successfully.', user });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to approve user.', error: error.message });
  }
};

export const getFlaggedSpots = async (req, res) => {
  try {
    const spots = await Spot.find({ spot_status: 'Pending' }).populate('host_id', 'full_name email');

    return res.status(200).json({ message: 'Flagged spots fetched successfully.', spots });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch flagged spots.', error: error.message });
  }
};

export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await user.deleteOne();

    return res.status(200).json({ message: 'User rejected and removed successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reject user.', error: error.message });
  }
};

export const suspendSpot = async (req, res) => {
  try {
    const { id } = req.params;

    const spot = await Spot.findById(id);
    if (!spot) {
      return res.status(404).json({ message: 'Spot not found.' });
    }

    spot.spot_status = 'Suspended';
    spot.is_active = false;
    await spot.save();

    return res.status(200).json({ message: 'Spot suspended successfully.', spot });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to suspend spot.', error: error.message });
  }
};
