# -*- coding: utf-8 -*-

import xmlrpc.client

url = "https://smartvase.odoo.com"
db = "smartvase"
username = "hila4616@gmail.com"
password = "e8290be49a358dc14e0ac4d02e8b3464ce5e483e"

# שלב 1 – התחברות וקבלת UID
common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
uid = common.authenticate(db, username, password, {})

# שלב 2 – שליפת מוצרים
models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
products = models.execute_kw(
    db, uid, password,
    'product.product', 'search_read',
    [[['sale_ok', '=', True]]],  # תנאים – לדוגמה: כל המוצרים שניתנים למכירה
    {'fields': ['id', 'name', 'qty_available', 'list_price']}
)

for product in products:
    print(f"{product['name']} – במלאי: {product['qty_available']}, מחיר: {product['list_price']}")
