<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

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
define('ODOO_PASSWORD', '123456');

function write_log($message, $data = null) {
    if (!file_exists(__DIR__ . '/logs')) {
        mkdir(__DIR__ . '/logs', 0755, true);
    }
    
    $log_file = __DIR__ . '/logs/odoo_inventory_simplified.log';
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp] $message";
    if ($data !== null) {
        $log_entry .= " | " . print_r($data, true);
    }
    $log_entry .= "\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

function write_usage_log($material_id, $material_name, $used_weight_grams, $order_details) {
    if (!file_exists(__DIR__ . '/logs')) {
        mkdir(__DIR__ . '/logs', 0755, true);
    }
    
    
    $csv_file = __DIR__ . '/logs/material_usage.csv';
    $timestamp = date('Y-m-d H:i:s');
    
    
    if (!file_exists($csv_file)) {
        $header = "timestamp,material_id,material_name,used_weight_grams,used_weight_kg,customer_email,order_notes\n";
        file_put_contents($csv_file, $header);
    }
    
    $used_weight_kg = round($used_weight_grams / 1000, 3);
    $customer_email = $order_details['email'] ?? 'unknown';
    $order_notes = "Height: {$order_details['height']}cm, Width: {$order_details['width']}cm, Color: {$order_details['color']}, Texture: {$order_details['texture']}";
    
    $csv_line = sprintf(
        "%s,%d,\"%s\",%0.2f,%0.3f,\"%s\",\"%s\"\n",
        $timestamp,
        $material_id,
        $material_name,
        $used_weight_grams,
        $used_weight_kg,
        $customer_email,
        $order_notes
    );
    
    file_put_contents($csv_file, $csv_line, FILE_APPEND | LOCK_EX);
    
    $summary_file = __DIR__ . '/logs/usage_summary.txt';
    $summary_line = "[$timestamp] Used $used_weight_grams g ($used_weight_kg kg) of $material_name for order by $customer_email\n";
    file_put_contents($summary_file, $summary_line, FILE_APPEND | LOCK_EX);
}

function send_response($data, $status_code = 200) {
    http_response_code($status_code);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit();
}

function authenticate_with_odoo() {
    write_log("Authenticating with Odoo");
    
    $auth_request = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => [
            'db' => ODOO_DB,
            'login' => ODOO_USERNAME,
            'password' => ODOO_PASSWORD,
            'context' => []
        ],
        'id' => rand(1, 999999)
    ];
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => ODOO_URL . '/web/session/authenticate',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($auth_request),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HEADER => true,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);
    
    if ($http_code !== 200) {
        return ['success' => false, 'error' => "HTTP $http_code"];
    }
    
    $headers = substr($response, 0, $header_size);
    $body = substr($response, $header_size);
    
    $session_id = null;
    if (preg_match('/session_id=([^;]+)/', $headers, $matches)) {
        $session_id = $matches[1];
    }
    
    $result = json_decode($body, true);
    
    if (isset($result['result']['uid'])) {
        write_log("Authentication successful - UID: " . $result['result']['uid']);
        return [
            'success' => true,
            'uid' => $result['result']['uid'],
            'session_id' => $session_id
        ];
    }
    
    return ['success' => false, 'error' => 'Authentication failed'];
}

function call_odoo_api($endpoint, $request_data, $session_id) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => ODOO_URL . $endpoint,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($request_data),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Cookie: session_id=' . $session_id
        ],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'success' => $http_code === 200,
        'result' => json_decode($response, true),
        'http_code' => $http_code,
        'raw_response' => $response
    ];
}

function calculate_weight($height, $width) {
    $h = floatval($height);
    $w = floatval($width);
    
    $wallThickness = 0.4;
    $bottomThickness = 0.6;
    
    $externalRadius = $w / 2;
    $internalRadius = max(0, $externalRadius - $wallThickness);
    
    $externalVolume = M_PI * pow($externalRadius, 2) * $h;
    $internalHeight = max(0, $h - $bottomThickness);
    $internalVolume = M_PI * pow($internalRadius, 2) * $internalHeight;
    
    $materialVolumeCm3 = $externalVolume - $internalVolume;
    $materialVolumeCm3 = $materialVolumeCm3 * 1.20 * 1.15 * 1.10;
    
    return $materialVolumeCm3 * 1.24; // PLA density
}

function find_material_by_color($materials, $colorHex, $texture = 'smooth') {
    $colorHex = strtolower($colorHex);
    if (substr($colorHex, 0, 1) !== '#') {
        $colorHex = '#' . $colorHex;
    }
    
    $colorMapping = [
        "#e7d5d5" => "white", "#000000" => "black", "#f14a4a" => "red",
        "#99db99" => "green", "#7878f1" => "blue", "#ffeb94" => "yellow",
        "#dd8add" => "purple", "#99dada" => "cyan", "#aaaaaa" => "gray",
        "#ffa500" => "orange"
    ];
    
    $colorName = $colorMapping[$colorHex] ?? null;
    if (!$colorName) {
        return null;
    }
    
    $expectedName = ($texture === 'matte') ? 
        "PLA " . ucfirst($colorName) . " Matte" : 
        "PLA " . ucfirst($colorName);
    
    foreach ($materials as $material) {
        if (trim($material['name']) === $expectedName) {
            return $material;
        }
    }
    
    // Fallback: partial match
    foreach ($materials as $material) {
        $materialName = strtolower(trim($material['name']));
        if (strpos($materialName, $colorName) !== false) {
            if ($texture === 'matte') {
                if (strpos($materialName, 'matte') !== false) {
                    return $material;
                }
            } else {
                if (strpos($materialName, 'matte') === false) {
                    return $material;
                }
            }
        }
    }
    
    return null;
}


function try_simple_quantity_update($material_id, $new_quantity, $auth_result) {
    write_log("Trying simple quantity update", [
        'material_id' => $material_id,
        'new_quantity' => $new_quantity
    ]);
    
    $update_request = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => [
            'model' => 'product.template',
            'method' => 'write',
            'args' => [[$material_id], ['qty_available' => $new_quantity]],
            'kwargs' => []
        ],
        'id' => rand(1, 999999)
    ];
    
    $result = call_odoo_api('/web/dataset/call_kw/product.template/write', $update_request, $auth_result['session_id']);
    
    if ($result['success'] && !isset($result['result']['error'])) {
        write_log("Simple quantity update successful");
        return ['success' => true, 'method' => 'simple_update'];
    }
    
    write_log("Simple quantity update failed", $result);
    return ['success' => false, 'error' => 'Simple update failed'];
}

// Main processing function
function process_material_usage($material, $used_weight_grams, $item_details, $auth_result) {
    $material_id = $material['id'];
    $material_name = $material['name'];
    $current_qty_kg = floatval($material['qty_available']);
    $used_weight_kg = $used_weight_grams / 1000;
    $new_qty_kg = max(0, $current_qty_kg - $used_weight_kg);
    
    write_log("Processing material usage", [
        'material' => $material_name,
        'current_qty_kg' => $current_qty_kg,
        'used_weight_kg' => $used_weight_kg,
        'new_qty_kg' => $new_qty_kg
    ]);
    
    
    write_usage_log($material_id, $material_name, $used_weight_grams, $item_details);
    
    // update quantity
    $update_result = try_simple_quantity_update($material_id, $new_qty_kg, $auth_result);
    
    $result = [
        'materialId' => $material_id,
        'materialName' => $material_name,
        'usedWeight' => $used_weight_grams,
        'previousQuantity' => $current_qty_kg,
        'newQuantity' => $new_qty_kg,
        'color' => $item_details['color'],
        'texture' => $item_details['texture'],
        'logged' => true,
        'updated' => $update_result['success'],
        'method' => $update_result['success'] ? $update_result['method'] : 'log_only'
    ];
    
    if ($update_result['success']) {
        write_log("Material usage processed with quantity update", $result);
    } else {
        write_log("Material usage logged only (update failed)", $result);
    }
    
    return $result;
}


try {
    write_log("Simplified inventory tracker started", $_POST);
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_response(['success' => false, 'error' => 'Method not allowed'], 405);
    }
    
    $cartItems = isset($_POST['cartItems']) ? json_decode($_POST['cartItems'], true) : [];
    if (empty($cartItems)) {
        send_response(['success' => false, 'error' => 'No cart items provided'], 400);
    }
    
    //authenticate 
    $auth_result = authenticate_with_odoo();
    $odoo_connected = $auth_result['success'];
    
    if ($odoo_connected) {
        write_log("Odoo connection successful");
        
        
        $materials_request = [
            'jsonrpc' => '2.0',
            'method' => 'call',
            'params' => [
                'model' => 'product.template',
                'method' => 'search_read',
                'args' => [
                    [['sale_ok', '=', true]],
                    ['id', 'name', 'default_code', 'list_price', 'qty_available']
                ],
                'kwargs' => [
                    'limit' => 100,
                    'order' => 'name'
                ]
            ],
            'id' => rand(1, 999999)
        ];
        
        $materials_result = call_odoo_api('/web/dataset/call_kw/product.template/search_read', $materials_request, $auth_result['session_id']);
        
        if ($materials_result['success']) {
            $materials = $materials_result['result']['result'] ?? [];
            write_log("Fetched materials from Odoo", ['count' => count($materials)]);
        } else {
            write_log("Failed to fetch materials from Odoo");
            $materials = [];
            $odoo_connected = false;
        }
    } else {
        write_log("Odoo connection failed, will log usage only");
        $materials = [];
    }
    
    // Process each cart item
    $updates = [];
    $errors = [];
    
    foreach ($cartItems as $item) {
        $color = $item['color'] ?? '#f14a4a';
        $texture = $item['texture'] ?? 'smooth';
        $height = $item['height'] ?? 15;
        $width = $item['width'] ?? 15;
        
        $item_details = [
            'color' => $color,
            'texture' => $texture,
            'height' => $height,
            'width' => $width,
            'email' => 'order_' . date('YmdHis') 
        ];
        
        write_log("Processing cart item", $item);
        
        
        $weightGrams = calculate_weight($height, $width);
        
        if ($odoo_connected && !empty($materials)) {
            // Find material in Odoo
            $material = find_material_by_color($materials, $color, $texture);
            if ($material) {
                // Process with Odoo data
                $result = process_material_usage($material, $weightGrams, $item_details, $auth_result);
                $updates[] = $result;
            } else {
                
                $error = "Material not found in Odoo for color $color, texture $texture";
                write_log($error);
                $errors[] = $error;
                
                
                write_usage_log(0, "Unknown Material ($color, $texture)", $weightGrams, $item_details);
                $updates[] = [
                    'materialId' => 0,
                    'materialName' => "Unknown Material ($color, $texture)",
                    'usedWeight' => $weightGrams,
                    'color' => $color,
                    'texture' => $texture,
                    'logged' => true,
                    'updated' => false,
                    'method' => 'log_only'
                ];
            }
        } else {
            
            write_usage_log(0, "Material ($color, $texture)", $weightGrams, $item_details);
            $updates[] = [
                'materialId' => 0,
                'materialName' => "Material ($color, $texture)",
                'usedWeight' => $weightGrams,
                'color' => $color,
                'texture' => $texture,
                'logged' => true,
                'updated' => false,
                'method' => 'log_only_no_connection'
            ];
        }
    }
    
    
    $logged_items = count($updates);
    $updated_items = count(array_filter($updates, function($u) { return $u['updated']; }));
    
    $response = [
        'success' => true,
        'updates' => $updates,
        'processed_items' => $logged_items,
        'updated_items' => $updated_items,
        'total_items' => count($cartItems),
        'odoo_connected' => $odoo_connected,
        'message' => $odoo_connected ? 
            "Material usage tracked successfully! $logged_items items logged, $updated_items items updated in Odoo." :
            "Material usage logged successfully! (Odoo connection unavailable - manual adjustment needed)"
    ];
    
    if (!empty($errors)) {
        $response['errors'] = $errors;
    }
    
    
    $response['log_files'] = [
        'detailed_log' => '/logs/odoo_inventory_simplified.log',
        'usage_csv' => '/logs/material_usage.csv',
        'usage_summary' => '/logs/usage_summary.txt'
    ];
    
    write_log("Simplified inventory tracking completed", $response);
    send_response($response);
    
} catch (Exception $e) {
    write_log("Exception occurred", $e->getMessage());
    send_response([
        'success' => false,
        'error' => 'Exception: ' . $e->getMessage()
    ], 500);
}
?>