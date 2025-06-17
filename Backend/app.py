from flask import Flask, jsonify, abort
from pymongo import MongoClient
from flask_cors import CORS  # Mengaktifkan CORS untuk mengizinkan akses dari domain lain
import logging
import os

# Inisialisasi aplikasi Flask
app = Flask(__name__)
CORS(app)  # Mengaktifkan CORS untuk aplikasi React

# Mengaktifkan logging untuk debug
logging.basicConfig(level=logging.DEBUG)

# Koneksi ke MongoDB - menggunakan environment variable atau fallback ke localhost
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'stock_data')

try:
    client = MongoClient(MONGODB_URI)
    # Test the connection
    client.admin.command('ping')
    db = client[DATABASE_NAME]
    logging.info(f"Successfully connected to MongoDB at {MONGODB_URI}")
    logging.info(f"Using database: {DATABASE_NAME}")
except Exception as e:
    logging.error(f"Failed to connect to MongoDB: {str(e)}")
    logging.error(f"Attempted to connect to: {MONGODB_URI}")
    # You might want to exit here or handle the error appropriately
    raise e


@app.route('/api/iqplusBerita', methods=['GET'])
def get_berita():
    """Get news data from iqplusBerita collection"""
    try:
        collection = db["iqplusBerita"]
        data = collection.find({}, {"_id": 0})
        
        # Convert cursor to list and return as JSON
        result = list(data)
        if not result:
            return jsonify({"error": "No news data found"}), 404
            
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Error fetching news data: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/lapkeuQ1/2024', methods=['GET'])
def get_lapkeu_q1():
    """Get financial statement data for Q4 2024"""
    try:
        collection = db["lapkeu2024q1"]
        data = collection.find({}, {"_id": 0})
        
        # Convert cursor to list and return as JSON
        result = list(data)
        if not result:
            return jsonify({"error": "No financial statement data found"}), 404
            
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Error fetching financial statement data: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/lapkeuQ2/2024', methods=['GET'])
def get_lapkeu_q2():
    """Get financial statement data for Q4 2024"""
    try:
        collection = db["lapkeu2024q2"]
        data = collection.find({}, {"_id": 0})
        
        # Convert cursor to list and return as JSON
        result = list(data)
        if not result:
            return jsonify({"error": "No financial statement data found"}), 404
            
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Error fetching financial statement data: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/api/lapkeuQ3/2024', methods=['GET'])
def get_lapkeu_q3():
    """Get financial statement data for Q4 2024"""
    try:    
        collection = db["lapkeu2024q3"]
        data = collection.find({}, {"_id": 0})
        
        # Convert cursor to list and return as JSON
        result = list(data)
        if not result:
            return jsonify({"error": "No financial statement data found"}), 404
            
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Error fetching financial statement data: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500



@app.route('/api/lapkeuQ4/2024', methods=['GET'])
def get_lapkeu_q4():
    """Get financial statement data for Q4 2024"""
    try:
        collection = db["lapkeu2024q4"]
        data = collection.find({}, {"_id": 0})
        
        # Convert cursor to list and return as JSON
        result = list(data)
        if not result:
            return jsonify({"error": "No financial statement data found"}), 404
            
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Error fetching financial statement data: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500







# Route untuk Root URL
@app.route('/')
def home():
    return "Welcome to the Stock Data API! Use /api/daily/<ticker>/<column> for stock data."

# API untuk mengambil data saham berdasarkan emiten dan kolom untuk daily
@app.route('/api/daily/<ticker>/<column>', methods=['GET'])
def get_stock_data_daily(ticker, column):
    logging.debug(f"Request received for daily data: ticker={ticker}, column={column}")
    collection = db["daily_aggregation_ticker"]  # Mengakses koleksi daily_aggregation_ticker
    return get_stock_data(collection, ticker, column)

# API untuk mengambil data saham berdasarkan emiten dan kolom untuk monthly
@app.route('/api/monthly/<ticker>/<column>', methods=['GET'])
def get_stock_data_monthly(ticker, column):
    logging.debug(f"Request received for monthly data: ticker={ticker}, column={column}")
    collection = db["monthly_aggregation_ticker"]  # Mengakses koleksi monthly_aggregation_ticker
    return get_stock_data(collection, ticker, column)

# API untuk mengambil data saham berdasarkan emiten dan kolom untuk yearly (tahunan)
@app.route('/api/yearly/<ticker>/<column>', methods=['GET'])
def get_stock_data_yearly(ticker, column):
    logging.debug(f"Request received for yearly data: ticker={ticker}, column={column}")
    collection = db["yearly_aggregation_ticker"]  # Mengakses koleksi yearly_aggregation_ticker
    return get_stock_data(collection, ticker, column)


# API untuk mengambil semua data saham berdasarkan emiten (tanpa filter kolom)
@app.route('/api/daily/<ticker>', methods=['GET'])
def get_all_stock_data_daily(ticker):
    logging.debug(f"Request received for all daily data: ticker={ticker}")
    collection = db["daily_aggregation_ticker"]
    return get_all_stock_data(collection, ticker)

@app.route('/api/monthly/<ticker>', methods=['GET'])
def get_all_stock_data_monthly(ticker):
    logging.debug(f"Request received for all monthly data: ticker={ticker}")
    collection = db["monthly_aggregation_ticker"]
    return get_all_stock_data(collection, ticker)

@app.route('/api/yearly/<ticker>', methods=['GET'])
def get_all_stock_data_yearly(ticker):
    logging.debug(f"Request received for all yearly data: ticker={ticker}")
    collection = db["yearly_aggregation_ticker"]
    return get_all_stock_data(collection, ticker)


# Fungsi untuk mengambil data saham berdasarkan emiten dan kolom yang diminta
def get_stock_data(collection, ticker, column):
    # Debug log untuk memeriksa koleksi yang digunakan
    logging.debug(f"Accessing collection: {collection.name} for ticker {ticker} and column {column}")

    # Mengambil data berdasarkan ticker dan kolom yang diminta
    if collection.name == "daily_aggregation_ticker":
        # Mengambil data daily
        data = collection.find({"ticker": ticker}, {"_id": 0, "Date": 1, column: 1})
    elif collection.name == "monthly_aggregation_ticker":
        # Mengambil data monthly
        data = collection.find({"ticker": ticker}, {"_id": 0, "Year": 1, "Month": 1, column: 1})
    elif collection.name == "yearly_aggregation_ticker":
        # Mengambil data yearly
        data = collection.find({"ticker": ticker}, {"_id": 0, "Year": 1, column: 1})

    # Menangani kasus ketika data kosong atau tidak ada yang ditemukan
    if collection.count_documents({"ticker": ticker}) == 0:
        logging.warning(f"Ticker {ticker} not found in collection {collection.name}")
        abort(404, description="Ticker not found")

    # Menyusun data untuk dikirim dalam format JSON
    stock_data = []
    if collection.name == "daily_aggregation_ticker":
        stock_data = [{"Date": item["Date"], column: item.get(column, "Column not available")} for item in data]
    elif collection.name == "monthly_aggregation_ticker":
        stock_data = [{"Year": item["Year"], "Month": item["Month"], column: item.get(column, "Column not available")} for item in data]
    elif collection.name == "yearly_aggregation_ticker":
        stock_data = [{"Year": item["Year"], column: item.get(column, "Column not available")} for item in data]

    logging.debug(f"Data retrieved: {stock_data}")
    return jsonify(stock_data)  # Mengembalikan data dalam format JSON


# Fungsi untuk mengambil semua data saham berdasarkan emiten
def get_all_stock_data(collection, ticker):
    logging.debug(f"Accessing collection: {collection.name} for ticker {ticker} (all columns)")
    
    # Mengambil semua data untuk ticker tanpa filter kolom
    data = collection.find({"ticker": ticker}, {"_id": 0})
    
    # Menangani kasus ketika data kosong atau tidak ada yang ditemukan
    if collection.count_documents({"ticker": ticker}) == 0:
        logging.warning(f"Ticker {ticker} not found in collection {collection.name}")
        abort(404, description="Ticker not found")
    
    # Mengkonversi cursor ke list
    stock_data = list(data)
    
    logging.debug(f"All data retrieved for {ticker}: {len(stock_data)} records")
    return jsonify(stock_data)


# Health check endpoint for Docker
@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Docker healthcheck"""
    try:
        # Test MongoDB connection
        client.admin.command('ping')
        return jsonify({
            "status": "healthy",
            "database": DATABASE_NAME,
            "mongodb_uri": MONGODB_URI.split('@')[-1] if '@' in MONGODB_URI else MONGODB_URI  # Hide credentials
        }), 200
    except Exception as e:
        logging.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 503

# Menangani kesalahan 404 jika ticker tidak ditemukan
@app.errorhandler(404)
def not_found_error(error):
    logging.error(f"404 error: {error.description}")
    return jsonify({"error": str(error)}), 404

# Menangani kesalahan umum
@app.errorhandler(Exception)
def handle_generic_error(error):
    logging.error(f"Unexpected error: {str(error)}")
    return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    # Development mode
    app.run(debug=True, host='0.0.0.0', port=5000)
else:
    # Production mode (when run with gunicorn or similar)
    logging.info("Running in production mode")


