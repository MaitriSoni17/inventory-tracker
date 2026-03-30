const Joi = require('joi');

// Auth validation schemas
const authSchemas = {
  signup: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match'
    }),
    role: Joi.string().valid('business_owner', 'employee', 'customer').required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updatePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  })
};

// Product validation schemas
const productSchemas = {
  create: Joi.object({
    name: Joi.string().max(200).required().messages({
      'string.max': 'Product name must not exceed 200 characters'
    }),
    description: Joi.string().max(500).allow(''),
    sku: Joi.string().required(),
    quantity: Joi.number().integer().min(0).required(),
    price: Joi.number().positive().required(),
    category: Joi.string().required(),
    supplier: Joi.string().allow('')
  }),

  update: Joi.object({
    name: Joi.string().max(200),
    description: Joi.string().max(500).allow(''),
    sku: Joi.string(),
    quantity: Joi.number().integer().min(0),
    price: Joi.number().positive(),
    category: Joi.string(),
    supplier: Joi.string().allow('')
  }).min(1)
};

// Order validation schemas
const orderSchemas = {
  create: Joi.object({
    orderNumber: Joi.string().required(),
    customerName: Joi.string().required(),
    customerEmail: Joi.string().email().required(),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().positive().required()
      })
    ).min(1).required(),
    totalAmount: Joi.number().positive().required(),
    status: Joi.string().valid('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'shipped', 'delivered', 'cancelled').required()
  })
};

// Employee validation schemas
const employeeSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9]{10,}$/).required(),
    position: Joi.string().required(),
    department: Joi.string().required(),
    salary: Joi.number().positive().required(),
    joinDate: Joi.date().required(),
    status: Joi.string().valid('active', 'inactive', 'on_leave').default('active')
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100),
    phone: Joi.string().pattern(/^[0-9]{10,}$/),
    position: Joi.string(),
    department: Joi.string(),
    salary: Joi.number().positive(),
    status: Joi.string().valid('active', 'inactive', 'on_leave')
  }).min(1)
};

// Pagination validation
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Utility function to validate data against schema
function validateData(data, schema) {
  const { value, error } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const messages = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return { valid: false, errors: messages, value: null };
  }

  return { valid: true, errors: null, value };
}

module.exports = {
  authSchemas,
  productSchemas,
  orderSchemas,
  employeeSchemas,
  paginationSchema,
  validateData
};
