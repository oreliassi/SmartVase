from flask import Flask, request, jsonify
import xmlrpc.client

app = Flask(__name__)

# פרטי ההתחברות ל-Odoo
url = "https://smartvase.odoo.com"
db = "smartvase"
username = "hila4616@gmail.com"
password = "e8290be49a358dc14e0ac4d02e8b3464ce5e483e"

common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")

@app.route("/products", methods=["GET"])
def get_products():
    products = models.execute_kw(
        db, uid, password,
        'product.product', 'search_read',
        [[('sale_ok', '=', True)]],
        {'fields': ['id', 'name', 'qty_available', 'list_price']}
    )
    return jsonify(products)

@app.route("/order", methods=["POST"])
def create_order():
    data = request.json
    product_id = data.get("product_id")
    qty = data.get("quantity")

    # בדיקה אם יש מלאי מספיק
    product = models.execute_kw(
        db, uid, password,
        'product.product', 'read',
        [product_id],
        {'fields': ['qty_available']}
    )[0]

    if product['qty_available'] < qty:
        return jsonify({"error": "Not enough stock"}), 400

    # כאן את יכולה להוסיף קוד להזמנה בפועל

    # עדכון מלאי (פשוט כהדגמה — לא אמיתי)
    # תצטרכי לשלב עם מודול המלאי של Odoo
    return jsonify({"status": "order placed", "product_id": product_id})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
