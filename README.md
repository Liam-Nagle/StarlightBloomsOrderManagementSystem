# Starlight Blooms Order Management System

A complete order management system for florist businesses with bouquet recipes, material inventory, pricing calculations, and profit tracking.

## Features

✨ **Order Management**
- Auto-generated order numbers (JAN001, FEB002, etc.)
- Customer information and delivery tracking
- Order status management (pending, completed, cancelled)
- Search and filter functionality

🌸 **Bouquet Management**
- Create bouquet recipes with materials
- Automatic pricing calculations
- Profit margin analysis
- Size variations (small, medium, large)

📦 **Material Inventory**
- Track flowers and hard materials
- Stock level monitoring
- Low stock alerts
- Supplier information

📊 **Reports & Analytics**
- Sales summaries
- Popular bouquets
- Profit analysis
- Inventory status
- Monthly trends

## Technology Stack

**Backend:**
- FastAPI (Python)
- Motor (async MongoDB driver)
- Pydantic for data validation
- MongoDB Atlas database

**Frontend:**
- Vanilla JavaScript (no build process needed)
- Modern CSS with CSS variables
- Responsive design

## Project Structure

```
StarlightBloomsTrackingWebsite/
├── backend/
│   ├── main.py                    # FastAPI application
│   ├── config.py                  # Configuration
│   ├── database.py                # MongoDB connection
│   ├── models/                    # Pydantic models
│   │   ├── material.py
│   │   ├── bouquet.py
│   │   └── order.py
│   ├── routes/                    # API endpoints
│   │   ├── materials.py
│   │   ├── bouquets.py
│   │   ├── orders.py
│   │   └── reports.py
│   ├── services/                  # Business logic
│   │   ├── order_number_generator.py
│   │   ├── bouquet_service.py
│   │   ├── material_service.py
│   │   └── order_service.py
│   └── utils/
│       └── seed_data.py           # Database seeding
├── frontend/
│   ├── index.html                 # Dashboard
│   ├── orders.html                # Orders page
│   ├── css/                       # Stylesheets
│   └── js/                        # JavaScript files
├── requirements.txt
├── .env.example
└── render.yaml                    # Deployment config
```

## Setup Instructions

### Prerequisites

- Python 3.11+
- MongoDB Atlas account
- Git

### 1. MongoDB Atlas Setup

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Create a database user
4. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
5. Whitelist your IP address (or use 0.0.0.0/0 for development)

### 2. Backend Setup

```bash
# Navigate to project directory
cd C:\Users\liamn\PycharmProjects\StarlightBloomsTrackingWebsite

# Activate virtual environment
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
copy .env.example .env

# Edit .env file with your MongoDB connection string
# Replace the MONGODB_URL with your actual connection string from MongoDB Atlas
```

Your `.env` file should look like:
```
MONGODB_URL=mongodb+srv://your-username:your-password@cluster.mongodb.net/
DATABASE_NAME=starlight_blooms
ENVIRONMENT=development
PORT=8000
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

### 3. Seed the Database

```bash
# Run the seeding script to populate initial data
python -m backend.utils.seed_data
```

This will create:
- 8 materials (roses, greens, ribbon, wrapping, etc.)
- 3 bouquet variations (The Amore Bouquet in small, medium, large)

### 4. Start the Backend Server

```bash
# Start the development server
uvicorn backend.main:app --reload --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 5. Start the Frontend

Open a new terminal and navigate to the frontend directory:

**Option 1: Using VS Code Live Server (Recommended)**
1. Install "Live Server" extension in VS Code
2. Right-click on `frontend/index.html`
3. Select "Open with Live Server"

**Option 2: Using Python HTTP Server**
```bash
cd frontend
python -m http.server 5500
```

The frontend will be available at: http://localhost:5500

## Testing the Application

1. **Open Swagger UI**: http://localhost:8000/docs
   - Test the API endpoints
   - View auto-generated documentation

2. **Test Materials API**:
   - GET `/api/materials` - Should return 8 materials
   - Try creating a new material

3. **Test Bouquets API**:
   - GET `/api/bouquets` - Should return 3 bouquets
   - View bouquet details with materials

4. **Open Frontend**: http://localhost:5500
   - Dashboard should show 0 orders
   - Materials and Bouquets pages should display seeded data
   - Try creating a test order

## API Endpoints

### Materials
- `GET /api/materials` - Get all materials
- `GET /api/materials/{id}` - Get specific material
- `POST /api/materials` - Create material
- `PUT /api/materials/{id}` - Update material
- `DELETE /api/materials/{id}` - Delete material
- `GET /api/materials/low-stock` - Get low stock items

### Bouquets
- `GET /api/bouquets` - Get all bouquets
- `GET /api/bouquets/{id}` - Get specific bouquet
- `POST /api/bouquets` - Create bouquet
- `PUT /api/bouquets/{id}` - Update bouquet
- `DELETE /api/bouquets/{id}` - Delete bouquet
- `POST /api/bouquets/calculate-price` - Calculate pricing

### Orders
- `GET /api/orders` - Get all orders (with filters)
- `GET /api/orders/{id}` - Get specific order
- `POST /api/orders` - Create order
- `PUT /api/orders/{id}` - Update order
- `DELETE /api/orders/{id}` - Delete order
- `GET /api/orders/today` - Get today's orders
- `GET /api/orders/pending` - Get pending orders
- `GET /api/orders/search?q={term}` - Search orders

### Reports
- `GET /api/reports/sales-summary` - Sales statistics
- `GET /api/reports/popular-bouquets` - Top selling bouquets
- `GET /api/reports/profit-analysis` - Profit margins
- `GET /api/reports/inventory-status` - Stock levels
- `GET /api/reports/monthly-trends` - Monthly sales trends

## Deployment

### Backend (Render)

1. Push code to GitHub
2. Create account on [Render](https://render.com)
3. Create new Web Service
4. Connect your GitHub repository
5. Render will detect `render.yaml` automatically
6. Add environment variables in Render dashboard:
   - `MONGODB_URL` - Your MongoDB Atlas connection string
   - `ALLOWED_ORIGINS` - Your GitHub Pages URL

### Frontend (GitHub Pages)

1. Update `frontend/js/config.js`:
   ```javascript
   API_BASE_URL: 'https://your-app-name.onrender.com'
   ```

2. Enable GitHub Pages in repository settings:
   - Settings → Pages
   - Source: Deploy from branch
   - Branch: main
   - Folder: /frontend

3. Access your site at: `https://username.github.io/repo-name/`

## Remaining Work

### Frontend Pages Still Needed:

1. **bouquets.html** - Bouquet management page
2. **materials.html** - Materials/inventory page
3. **reports.html** - Analytics page

### JavaScript Files Still Needed:

1. **frontend/js/components/modal.js** - Modal component
2. **frontend/js/pages/orders.js** - Orders page logic
3. **frontend/js/pages/bouquets.js** - Bouquets page logic
4. **frontend/js/pages/materials.js** - Materials page logic
5. **frontend/js/pages/reports.js** - Reports page logic

### CSS Files Still Needed:

1. **frontend/css/dashboard.css** - Dashboard specific styles
2. **frontend/css/forms.css** - Form styling
3. **frontend/css/tables.css** - Table styling

## Bouquet Pricing Formula

The system calculates bouquet prices using this formula:

```
Calculated Sale Price =
    (Flower Cost × 1.8) +
    (Hard Material Cost × 2.0) +
    Labour Cost

Labour Costs:
- Small: £10
- Medium: £15
- Large: £20
```

Example for Medium Amore Bouquet:
- Flower Cost: £22.86
- Hard Material Cost: £4.06
- Labour: £15
- **Calculated Price**: £56.66
- **Actual Sell Price**: £69.99 (customizable)

## Database Schema

### Materials Collection
```python
{
    "name": "Rose Red Naomi 50cm",
    "type": "Flower",  # or "Hard Material"
    "cost_per_unit": 2.46,
    "supplier": "Savin Wholesale",
    "product_number": "27157",
    "current_stock": 100,
    "unit": "stem"
}
```

### Bouquets Collection
```python
{
    "name": "The Amore Bouquet",
    "size": "medium",
    "materials": [
        {
            "material_id": "...",
            "name": "Rose Red Naomi 50cm",
            "quantity": 4,
            "cost_per_unit": 2.46,
            "total_cost": 9.84
        }
    ],
    "total_cost": 26.92,
    "calculated_sale_price": 56.66,
    "sell_price": 69.99,
    "profit": 43.07,
    "profit_margin": 61.54,
    "total_stems": 21
}
```

### Orders Collection
```python
{
    "order_number": "FEB001",
    "customer_name": "Jane Smith",
    "bouquet_type": "The Amore Bouquet",
    "size": "medium",
    "date": "2026-02-14",
    "delivery_address": "123 High St, Cardiff",
    "total_price": 69.99,
    "status": "pending",
    "notes": "Deliver before 3pm",
    "created_at": "2026-02-10T10:30:00"
}
```

## Troubleshooting

### Backend won't start
- Check `.env` file exists and has correct MongoDB URL
- Verify virtual environment is activated
- Check MongoDB Atlas IP whitelist

### Cannot connect to database
- Verify MongoDB connection string is correct
- Check database user has correct permissions
- Ensure IP address is whitelisted in MongoDB Atlas

### Frontend can't connect to API
- Check `frontend/js/config.js` has correct API_BASE_URL
- Verify backend is running on port 8000
- Check CORS settings in backend

### Seed data fails
- Verify MongoDB connection works
- Check if collections already exist (script skips if data exists)
- Look for error messages in console

## Support

For issues or questions:
1. Check the API documentation at http://localhost:8000/docs
2. Review error messages in browser console (F12)
3. Check backend logs in terminal

## License

MIT License - feel free to use and modify for your business needs.
