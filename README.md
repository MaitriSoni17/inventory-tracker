# Inventory Tracker - Smart Inventory Management System

A comprehensive, full-stack inventory management application with AI-powered features, role-based access control, and real-time notifications. Built with **React**, **Node.js/Express**, and **MongoDB**.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB (local or cloud)
- npm or yarn

### Installation
```bash
# Install dependencies (frontend & backend)
npm install

# Or install separately
npm run frontend:install
npm run backend:install
```

### Configuration
Create `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/inventory-tracker
JWT_SECRET=your-secret-key-here
PORT=5000
NODE_ENV=development
```

### Run Development Environment
```bash
# Run both frontend and backend concurrently
npm run dev

# Or run separately:
npm run backend:dev    # Terminal 1
npm run frontend:start # Terminal 2
```

### Seed Sample Data
```bash
# Populate MongoDB with demo data linked to existing frontend dashboards
npm run backend:seed
```

Seeded demo logins:
- Business Owner: owner@test.com / Owner@123
- Manager: manager1@test.com / Manager@123
- Supplier: supplier1@test.com / Supplier@123

### Run Tests
```bash
cd backend
npm test              # Run all backend tests
npm run test:ci       # CI-safe backend test run
npm test:watch       # Watch mode
npm test:coverage    # With coverage report

cd ../frontend
npm test              # Run frontend tests
```

**View App**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: See `backend/swagger.json`

---

## 📋 Recent Improvements (v1.0.1)

All of the following improvements have been implemented and tested:

### ✅ Security & Infrastructure
- **Environment Validation**: Fail-fast env var validation
- **Security Headers**: Helmet, CORS, XSS protection
- **Rate Limiting**: 
  - General: 100 req/15min per IP
  - Auth: 5 login attempts/15min
  - Sensitive ops: 20 per hour
- **Structured Logging**: Request logging with unique IDs, error tracking

### ✅ Input Validation & Error Handling
- **Joi Validation Schemas**: Auth, products, orders, employees
- **Global Error Handler**: Standardized error responses
- **Request Validation Middleware**: Auto-catch validation errors

### ✅ Frontend Data Management
- **React Query**: Unified API client with caching
- **Data Hooks**: `useFetchData()`, `useCreateData()`, `useUpdateData()`, `useDeleteData()`
- **Auto Query Invalidation**: Sync data on mutations
- **Enhanced Validation Helper**: 20+ validation rules, international phone support

### ✅ Scalable Architecture
- **Service Layer Pattern**: ProductService, BaseService base
- **Pagination Helper**: Safe filters, sorting, pagination across APIs
- **API Versioning Ready**: Structure supports /api/v1 migrations

### ✅ Testing & Documentation
- **Backend test suite** ✅ passing
- **Frontend Test Setup**: Ready for component tests
- **OpenAPI Documentation**: Full API spec in `swagger.json`
- **GitHub Actions CI**: Backend tests + frontend production build

---

## 📁 Project Structure

```
inventory-tracker/
├── backend/
│   ├── config/              # Configuration files (NEW)
│   │   ├── envValidation.js
│   │   ├── logger.js
│   │   ├── security.js
│   │   ├── errorHandler.js
│   │   └── ...
│   ├── services/            # Service layer (NEW)
│   │   ├── BaseService.js
│   │   └── ProductService.js
│   ├── routes/              # API routes
│   ├── models/              # MongoDB models
│   ├── middleware/          # Express middleware
│   ├── utils/               # Utility functions
│   ├── __tests__/           # Unit tests (NEW)
│   ├── logs/                # Log files (auto-created)
│   ├── uploads/             # File uploads
│   ├── app.js               # Express app composition
│   ├── index.js             # Server bootstrap entry
│   ├── db.js                # MongoDB connection
│   ├── package.json
│   ├── jest.config.json     # Jest configuration
│   ├── jest.setup.js        # Jest setup
│   └── swagger.json         # API documentation
│
├── frontend/
│   ├── src/
│   │   ├── config/          # Frontend config (NEW)
│   │   │   └── queryClient.js
│   │   ├── hooks/           # Custom hooks (NEW)
│   │   │   └── useApi.js
│   │   ├── components/      # React components
│   │   ├── context/         # React context
│   │   ├── utils/           # Utilities
│   │   ├── styles/          # CSS
│   │   └── App.js
│   ├── public/
│   └── package.json
│
├── IMPROVEMENTS.md          # Detailed improvements (NEW)
├── USER_MANUAL.md           # User documentation
└── package.json             # Root workspace scripts
```

---

## 🔑 Key Features

### Business Management
- 👥 **Role-Based Access Control**: Business Owner, Employee (Manager/Supervisor), Supplier, Customer
- 📦 **Inventory Management**: Products, categories, stock levels
- 📋 **Order Management**: Customer orders, supplier orders
- 🏭 **Warehouse Management**: Multiple warehouses, stock allocation
- 💰 **Salary Management**: Employee payroll tracking

### Advanced Features
- 🤖 **AI Chatbot**: Powered by OpenAI/Groq for smart assistance
- 📊 **Reports & Analytics**: Inventory, sales, supplier reports with export
- 🔔 **Real-time Notifications**: Order updates, low stock alerts
- 💬 **Messaging System**: Direct communication between users
- 📱 **Responsive Design**: Mobile-friendly interface

### Developer Features
- ✅ **Comprehensive Tests**: Unit tests with CI-safe test command
- 📖 **API Documentation**: OpenAPI/Swagger spec
- 🔐 **Security Best Practices**: Rate limiting, validation, error handling
- 📝 **Structured Logging**: Request tracking and error monitoring

---

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password

### Products
- `GET /api/products?page=1&limit=10` - List products with pagination
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/customerorders` - List customer orders
- `POST /api/customerorders` - Create order
- `GET /api/supplierorders` - List supplier orders
- `POST /api/supplierorders` - Create supplier order

### Employees
- `GET /api/employee` - List employees
- `POST /api/employee` - Create employee
- `PUT /api/employee/:id` - Update employee
- `DELETE /api/employee/:id` - Delete employee

### (See `backend/swagger.json` for complete API spec)

---

## 🧪 Testing

### Run All Tests
```bash
cd backend
npm test
```

### Test Coverage
```bash
cd backend
npm run test:coverage
```

### Watch Mode (Development)
```bash
cd backend
npm test:watch
```

### Test Files
- `backend/__tests__/chatbotHelper.test.js` - chatbot logic and query coverage
- `backend/__tests__/health.test.js` - service availability health check

---

## 📚 Documentation

### User & Admin Documentation
- **User Manual**: See [USER_MANUAL.md](USER_MANUAL.md) for complete user guide
- **API Documentation**: See [backend/swagger.json](backend/swagger.json) for API spec

### Developer Documentation
- **Improvements Guide**: See [IMPROVEMENTS.md](IMPROVEMENTS.md) for technical improvements
- **Code Structure**: Each service and utility has inline documentation
- **Validation**: Implemented through route-level validators and schema checks

---

## 🔐 Security Features

### Built-In Protections
✅ **Environment Validation** - Fails fast if required config missing  
✅ **Rate Limiting** - Prevents brute force attacks  
✅ **Security Headers** - Helmet protection against common vulnerabilities  
✅ **Input Validation** - Route-level validation helps prevent injection attacks  
✅ **Error Handling** - No internal error details leaked in production  
✅ **Request Logging** - Audit trail for security investigations  
✅ **JWT Authentication** - Secure token-based auth  
✅ **Role-Based Access** - Permission checking on operations  

### Production Checklist
- [ ] Set strong JWT_SECRET
- [ ] Configure CORS_ORIGINS for your domain
- [ ] Use HTTPS in production
- [ ] Set NODE_ENV=production
- [ ] Enable MongoDB authentication
- [ ] Review security headers in production
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Enable HTTPS and use secure cookies

---

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables (Production)
```env
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/inventory
JWT_SECRET=your-very-strong-secret-key
PORT=5000
NODE_ENV=production

# Optional (with defaults)
CORS_ORIGINS=https://example.com,https://www.example.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

---

## 🐛 Troubleshooting

### Tests Failing?
1. Ensure test database is accessible
2. Check MongoDB connection string in jest.setup.js
3. Run `npm test` from backend directory

### API Returning Errors?
1. Check backend logs in `backend/logs/`
2. Verify environment variables are set
3. Ensure MongoDB is running
4. Check request format in API docs

### Frontend Not Connecting?
1. Verify backend is running on port 5000
2. Check CORS configuration in `backend/config/security.js`
3. Review browser console for errors
4. Check apiClient.js configuration

---

## 📝 Contributing

### Code Style
- Use meaningful variable names
- Add comments for complex logic
- Write tests for new features
- Follow existing patterns (e.g., service layer)

### Adding New Endpoints
1. Add route-level validation in the corresponding route file
2. Create service method in appropriate service class
3. Add route handler with validation
4. Use global error handler for errors
5. Write tests in `__tests__/` directory
6. Update `backend/swagger.json` documentation

---

## 📄 License

This project is provided as-is for educational and business use.

---

## 📞 Support

For issues, questions, or suggestions:
1. Check [USER_MANUAL.md](USER_MANUAL.md) for user help
2. Review [IMPROVEMENTS.md](IMPROVEMENTS.md) for technical details
3. Check test files for usage examples
4. Review error logs in `backend/logs/`

---

**Version**: 1.0.1  
**Last Updated**: March 2026  
**Status**: Production Ready ✅
