#!/usr/bin/env python3
"""
Python handler for Odoo API requests
Place this in the /python directory relative to your web root
"""

import sys
import os
import json
import logging
import requests
from datetime import datetime

log_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
log_file = os.path.join(log_dir, "python_handler.log")
logging.basicConfig(
    filename=log_file,
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def log(message):
    """Log a message to both the log file and stdout"""
    logging.info(message)
    print(message, file=sys.stderr)

def handle_odoo_request(endpoint, method, input_data=None):
    """Handle an Odoo API request"""
    
    log(f"Handling {method} request for endpoint: {endpoint}")
    
    odoo_url = "https://smartvase.odoo.com"
    db = "smartvase"
    username = "hila4616@gmail.com"
    password = "e8290be49a358dc14e0ac4d02e8b3464ce5e483e"
    
    if endpoint == "test":
        return {
            "status": "ok",
            "message": "Python handler is working",
            "timestamp": datetime.now().isoformat(),
            "python_version": sys.version
        }
    
    if endpoint == "authenticate" or endpoint == "login":
        auth_url = f"{odoo_url}/web/session/authenticate"
        auth_data = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "db": db,
                "login": username,
                "password": password,
                "context": {}
            },
            "id": 1
        }
        
        if input_data:
            try:
                input_json = json.loads(input_data)
                if "params" in input_json:
                    auth_data["params"] = input_json["params"]
            except json.JSONDecodeError as e:
                log(f"Failed to parse input JSON: {e}")
        
        log(f"Sending authentication request to {auth_url}")
        
        try:
            session = requests.Session()
            response = session.post(auth_url, json=auth_data)
            response.raise_for_status()
            
            result = response.json()
            log(f"Authentication response status code: {response.status_code}")
            
            cookie_file = os.path.join(os.path.dirname(__file__), "odoo_cookies.json")
            with open(cookie_file, "w") as f:
                json.dump(session.cookies.get_dict(), f)
            
            return result
            
        except requests.exceptions.RequestException as e:
            log(f"Authentication request failed: {e}")
            return {"error": {"message": str(e), "code": 500}}
    
    if endpoint == "materials":
        materials_url = f"{odoo_url}/web/dataset/call_kw/product.template/search_read"
        
        materials_data = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "model": "product.template",
                "method": "search_read",
                "args": [
                    [["type", "=", "product"]],  # Filter for physical products
                    ["id", "name", "default_code", "list_price", "color", "texture"]
                ],
                "kwargs": {}
            },
            "id": 1
        }
        
        if input_data:
            try:
                input_json = json.loads(input_data)
                # Only override params to maintain proper structure
                if "params" in input_json:
                    materials_data["params"] = input_json["params"]
            except json.JSONDecodeError as e:
                log(f"Failed to parse input JSON: {e}")
        
        log(f"Sending materials request to {materials_url}")
        
        try:
            session = requests.Session()
            cookie_file = os.path.join(os.path.dirname(__file__), "odoo_cookies.json")
            if os.path.exists(cookie_file):
                with open(cookie_file, "r") as f:
                    cookies = json.load(f)
                    for key, value in cookies.items():
                        session.cookies.set(key, value)
            
            response = session.post(materials_url, json=materials_data)
            response.raise_for_status()
            
            result = response.json()
            log(f"Materials response status code: {response.status_code}")
            log(f"Found {len(result.get('result', []))} materials")
            
            return result
            
        except requests.exceptions.RequestException as e:
            log(f"Materials request failed: {e}")
            return {"error": {"message": str(e), "code": 500}}
    
    return {"error": {"message": f"Unsupported endpoint: {endpoint}", "code": 400}}

def main():
    """Main entry point for the script"""
    
    if len(sys.argv) < 3:
        log("Error: Missing required arguments")
        json_response = {"error": {"message": "Missing arguments", "code": 400}}
        print(json.dumps(json_response))
        return
    
    endpoint = sys.argv[1]
    method = sys.argv[2]
    
    input_data = None
    if not sys.stdin.isatty():
        input_data = sys.stdin.read()
    
    result = handle_odoo_request(endpoint, method, input_data)
    
    print(json.dumps(result))

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"Unhandled exception: {e}")
        json_response = {"error": {"message": str(e), "code": 500}}
        print(json.dumps(json_response))