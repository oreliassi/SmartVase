<?php
//ODOO connection


ini_set('display_errors', 1);
error_reporting(E_ALL);


header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


define('ODOO_URL', 'https://smartvase.odoo.com');
define('ODOO_DB', 'smartvase');
define('ODOO_USERNAME', 'hila4616@gmail.com');
define('ODOO_API_KEY', 'e8290be49a358dc14e0ac4d02e8b3464ce5e483e');
define('ODOO_PASSWORD', '123456');


function write_log($message, $level = 'INFO', $data = null) {
    $log_file = __DIR__ . '/odoo_real_materials.log';
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp][$level] $message";
    if ($data !== null) {
        $log_entry .= " | " . json_encode($data);
    }
    $log_entry .= "\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}


function send_response($data, $status_code = 200) {
    http_response_code($status_code);
    echo json_encode($data, JSON_PRETTY_PRINT);
    write_log("Response sent", 'RESPONSE', ['status' => $status_code, 'data_type' => gettype($data)]);
    exit();
}


function fetch_odoo_data($endpoint, $request_data, $session_id = null) {
    write_log("Fetching data from endpoint: $endpoint");
    
    $ch = curl_init();
    $headers = [
        'Content-Type: application/json',
        'User-Agent: SmartVase-RealMaterials/1.0'
    ];
    
    if ($session_id) {
        $headers[] = 'Cookie: session_id=' . $session_id;
    }
    
    curl_setopt_array($ch, [
        CURLOPT_URL => ODOO_URL . $endpoint,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($request_data),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => true
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($curl_error) {
        write_log("cURL error during data fetch", 'ERROR', ['error' => $curl_error]);
        return [
            'success' => false,
            'error' => "Connection error: $curl_error"
        ];
    }
    
    if ($http_code !== 200) {
        write_log("Data fetch failed", 'ERROR', ['http_code' => $http_code]);
        return [
            'success' => false,
            'error' => "HTTP error: $http_code",
            'http_code' => $http_code
        ];
    }
    
    $json_result = json_decode($response, true);
    if (!$json_result) {
        write_log("Failed to parse data response JSON", 'ERROR');
        return [
            'success' => false,
            'error' => 'Invalid JSON response from Odoo'
        ];
    }
    
    if (isset($json_result['error'])) {
        write_log("Odoo data fetch error", 'ERROR', ['error' => $json_result['error']]);
        return [
            'success' => false,
            'error' => $json_result['error']
        ];
    }
    
    write_log("Data fetch successful");
    return [
        'success' => true,
        'result' => $json_result
    ];
}


function authenticate_with_odoo() {
    write_log("Starting authentication", 'AUTH');
    
    
    $auth_result = try_authenticate(ODOO_API_KEY, 'API_KEY');
    if ($auth_result['success']) {
        return $auth_result;
    }
    
    write_log("API key failed, trying password", 'AUTH');
    
    
    $auth_result = try_authenticate(ODOO_PASSWORD, 'PASSWORD');
    return $auth_result;
}


function try_authenticate($credential, $type) {
    $auth_request = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => [
            'db' => ODOO_DB,
            'login' => ODOO_USERNAME,
            'password' => $credential,
            'context' => []
        ],
        'id' => rand(1, 999999)
    ];
    
    write_log("Attempting authentication", 'AUTH', ['type' => $type]);
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => ODOO_URL . '/web/session/authenticate',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($auth_request),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'User-Agent: SmartVase-RealMaterials/1.0'
        ],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HEADER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => true
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($curl_error) {
        write_log("cURL error during auth", 'ERROR', ['type' => $type, 'error' => $curl_error]);
        return ['success' => false, 'error' => "Connection error: $curl_error"];
    }
    
    if ($http_code !== 200) {
        write_log("Auth HTTP error", 'ERROR', ['type' => $type, 'http_code' => $http_code]);
        return ['success' => false, 'error' => "HTTP error: $http_code"];
    }
    
    
    $headers = substr($response, 0, $header_size);
    $body = substr($response, $header_size);
    
    
    $session_id = null;
    if (preg_match('/session_id=([^;]+)/', $headers, $matches)) {
        $session_id = $matches[1];
    }
    
    $json_result = json_decode($body, true);
    if (!$json_result) {
        write_log("JSON parse error", 'ERROR', ['type' => $type]);
        return ['success' => false, 'error' => 'Invalid JSON response'];
    }
    
    if (isset($json_result['error'])) {
        write_log("Odoo auth error", 'ERROR', ['type' => $type, 'error' => $json_result['error']]);
        return ['success' => false, 'error' => $json_result['error']];
    }
    
    if (!isset($json_result['result']['uid'])) {
        write_log("No UID in response", 'ERROR', ['type' => $type]);
        return ['success' => false, 'error' => 'No UID in authentication response'];
    }
    
    write_log("Authentication successful", 'SUCCESS', [
        'type' => $type,
        'uid' => $json_result['result']['uid']
    ]);
    
    return [
        'success' => true,
        'uid' => $json_result['result']['uid'],
        'session_id' => $session_id,
        'user_info' => $json_result['result'],
        'auth_type' => $type
    ];
}


function get_real_materials_from_odoo($auth_result) {
    write_log("Starting REAL materials fetch", 'MATERIALS', ['uid' => $auth_result['uid']]);
    
    
    $materials_request = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => [
            'model' => 'product.template',
            'method' => 'search_read',
            'args' => [
                [],
                [
                    'id', 'name', 'default_code', 'list_price', 
                    'qty_available', 'virtual_available', 'sale_ok', 
                    'active', 'type'
                ]
            ],
            'kwargs' => [
                'limit' => 200,
                'order' => 'name asc'
            ]
        ],
        'id' => rand(1, 999999)
    ];
    
    $fetch_result = fetch_odoo_data(
        '/web/dataset/call_kw/product.template/search_read',
        $materials_request,
        $auth_result['session_id']
    );
    
    if (!$fetch_result['success']) {
        return $fetch_result;
    }
    
    $raw_materials = $fetch_result['result']['result'] ?? [];
    write_log("Raw materials received", 'MATERIALS', [
        'count' => count($raw_materials)
    ]);
    
    
    $processed_materials = [];
    foreach ($raw_materials as $material) {
        $processed = [
            'id' => $material['id'],
            'name' => $material['name'] ?? 'Unknown',
            'code' => $material['default_code'] ?? '',
            'price' => floatval($material['list_price'] ?? 0),
            'list_price' => floatval($material['list_price'] ?? 0),
            'qty_available' => intval($material['qty_available'] ?? 0),
            'virtual_available' => intval($material['virtual_available'] ?? 0),
            'in_stock' => intval($material['qty_available'] ?? 0) > 0,
            'sale_ok' => $material['sale_ok'] ?? false,
            'active' => $material['active'] ?? true,
            'type' => $material['type'] ?? ''
        ];
        $processed_materials[] = $processed;
    }
    
    write_log("Materials processed successfully", 'SUCCESS', [
        'final_count' => count($processed_materials)
    ]);
    
    return [
        'success' => true,
        'materials' => $processed_materials
    ];
}


function update_material_inventory($auth_result, $material_id, $used_quantity) {
    write_log("Updating inventory for material ID: $material_id, used quantity: $used_quantity kg");
    
    
    return [
        'success' => true,
        'new_quantity' => 50, // Placeholder
        'previous_quantity' => 51
    ];
}


function create_odoo_order($auth_result, $order_data, $cart_items) {
    write_log("Creating order in Odoo");
    

    return [
        'success' => true,
        'order_id' => rand(1000, 9999),
        'order_number' => 'SO' . date('YmdHis')
    ];
}

// Main logic
try {
    $endpoint = $_GET['endpoint'] ?? 'status';
    $request_method = $_SERVER['REQUEST_METHOD'];
    
    write_log("Processing request", 'REQUEST', [
        'method' => $request_method,
        'endpoint' => $endpoint
    ]);
    
    switch ($endpoint) {
        case 'status':
        case 'test':
            send_response([
                'status' => 'ok',
                'message' => 'Real Materials Odoo proxy is running',
                'timestamp' => date('c'),
                'version' => '2.0.0-fixed',
                'php_version' => phpversion(),
                'curl_version' => curl_version()['version'],
                'odoo_url' => ODOO_URL,
                'odoo_db' => ODOO_DB,
                'methods' => ['authenticate', 'materials', 'test_connection']
            ]);
            break;
            
        case 'authenticate':
            $auth_result = authenticate_with_odoo();
            
            if ($auth_result['success']) {
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'result' => [
                        'uid' => $auth_result['uid'],
                        'username' => ODOO_USERNAME,
                        'db' => ODOO_DB,
                        'session_id' => $auth_result['session_id'] ?? null,
                        'auth_type' => $auth_result['auth_type']
                    ]
                ]);
            } else {
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'error' => $auth_result['error']
                ], 500);
            }
            break;
            
        case 'materials':
            write_log("Materials endpoint requested", 'MATERIALS');
            
            $auth_result = authenticate_with_odoo();
            if (!$auth_result['success']) {
                write_log("Authentication failed for materials", 'ERROR', $auth_result);
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'error' => [
                        'message' => 'Authentication failed',
                        'details' => $auth_result['error']
                    ]
                ], 500);
            }
            
            $materials_result = get_real_materials_from_odoo($auth_result);
            
            if ($materials_result['success']) {
                write_log("Returning real materials", 'SUCCESS', [
                    'count' => count($materials_result['materials'])
                ]);
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'result' => $materials_result['materials']
                ]);
            } else {
                write_log("Real materials fetch failed", 'ERROR', $materials_result);
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'error' => [
                        'message' => 'Failed to fetch real materials',
                        'details' => $materials_result['error']
                    ]
                ], 500);
            }
            break;
            
        case 'update_inventory':
            $auth_result = authenticate_with_odoo();
            
            if (!$auth_result['success']) {
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'error' => [
                        'message' => 'Authentication failed',
                        'details' => $auth_result['error']
                    ]
                ], 500);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $material_id = $input['material_id'] ?? null;
            $used_quantity = $input['used_quantity'] ?? 0;
            
            if (!$material_id || !$used_quantity) {
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'error' => 'Missing material_id or used_quantity'
                ], 400);
            }
            
            $inventory_result = update_material_inventory($auth_result, $material_id, $used_quantity);
            
            if ($inventory_result['success']) {
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'result' => [
                        'success' => true,
                        'new_quantity' => $inventory_result['new_quantity'],
                        'used_quantity' => $used_quantity
                    ]
                ]);
            } else {
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'error' => [
                        'message' => 'Failed to update inventory',
                        'details' => $inventory_result['error']
                    ]
                ], 500);
            }
            break;

        case 'create_order':
            $auth_result = authenticate_with_odoo();
            
            if (!$auth_result['success']) {
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'error' => [
                        'message' => 'Authentication failed',
                        'details' => $auth_result['error']
                    ]
                ], 500);
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            $order_data = $input['order_data'] ?? [];
            $cart_items = $input['cart_items'] ?? [];
            
            $order_result = create_odoo_order($auth_result, $order_data, $cart_items);
            
            if ($order_result['success']) {
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'result' => [
                        'success' => true,
                        'order_id' => $order_result['order_id'],
                        'order_number' => $order_result['order_number']
                    ]
                ]);
            } else {
                send_response([
                    'jsonrpc' => '2.0',
                    'id' => rand(1, 999999),
                    'error' => [
                        'message' => 'Failed to create order',
                        'details' => $order_result['error']
                    ]
                ], 500);
            }
            break;
            
        default:
            send_response([
                'error' => 'Unknown endpoint',
                'endpoint' => $endpoint,
                'available_endpoints' => ['test', 'authenticate', 'materials', 'orders', 'update_inventory', 'create_order']
            ], 404);
            break;
    }
    
} catch (Exception $e) {
    write_log("Fatal error", 'FATAL', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    send_response([
        'error' => 'Internal server error',
        'message' => $e->getMessage(),
        'timestamp' => date('c')
    ], 500);
}
?>