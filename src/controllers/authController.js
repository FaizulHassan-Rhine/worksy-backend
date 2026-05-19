const { z } = require('zod');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { ok, fail } = require('../utils/apiResponse');
const { createPersonalWorkspace } = require('../services/workspaceService');

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Please provide a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Please provide a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const register = async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return fail(res, 400, 'Email already registered');
    }

    const user = await User.create({ name, email, password });
    const workspace = await createPersonalWorkspace(user);
    const token = generateToken(user._id);

    return ok(
      res,
      { user: user.toSafeObject(), token, workspace: workspace.toSafeObject() },
      'Registration successful',
      201
    );
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return fail(res, 401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return fail(res, 401, 'Invalid email or password');
    }

    const token = generateToken(user._id);

    return ok(res, { user: user.toSafeObject(), token }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  return ok(res, { user: req.user.toSafeObject() }, 'User fetched successfully');
};

const logout = async (req, res) => {
  return ok(res, null, 'Logout successful');
};

module.exports = { register, login, me, logout };
