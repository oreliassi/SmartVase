<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');


$host = "localhost";
$db = "isinbalbe3_smartVase_db";
$user = "isinbalbe3_isinbalbe3";
$pass = "J33v,lSVyK0f";


function write_log($message, $data = null) {
    if (!file_exists(__DIR__ . '/logs')) {
        mkdir(__DIR__ . '/logs', 0755, true);
    }
    
    $log_file = __DIR__ . '/logs/pending_orders.log';
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp] $message";
    if ($data !== null) {
        $log_entry .= " | " . print_r($data, true);
    }
    $log_entry .= "\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

try {
    write_log("Fetching pending orders");
    
    $conn = new mysqli($host, $user, $pass, $db);
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8");
    
    $stmt = $conn->prepare("
        SELECT 
            order_number,
            email,
            shipping,
            price,
            city,
            street,
            apartment,
            first_name,
            last_name,
            phone,
            status,
            date,
            CASE 
                WHEN order_number IN (1000, 1004, 1745413904, 1747657529) THEN 0
                WHEN status = 'pending' THEN 1
                WHEN status = 'confirmed' THEN 2
                WHEN status = 'printing' THEN 3
                ELSE 4
            END as priority_order
        FROM orders 
        WHERE status IN ('pending', 'confirmed', 'printing') 
           OR order_number IN (1000, 1004, 1745413904, 1747657529)
        ORDER BY priority_order ASC, date ASC 
        LIMIT 6
    ");
    
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $orders = [];
    while ($row = $result->fetch_assoc()) {
        
        $row['customer_name'] = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
        $row['full_address'] = trim(
            ($row['city'] ?? '') . ', ' . 
            ($row['street'] ?? '') . ' ' . 
            ($row['apartment'] ?? '')
        );
        
        $row['full_address'] = str_replace(', , ', ', ', $row['full_address']);
        $row['full_address'] = trim($row['full_address'], ', ');
        
        if (empty($row['full_address'])) {
            $row['full_address'] = 'כתובת לא צוינה';
        }
        
        $orders[] = $row;
    }
    
    write_log("Found orders", ['count' => count($orders), 'orders' => array_column($orders, 'order_number')]);
    
    echo json_encode($orders);
    
} catch (Exception $e) {
    write_log("Error fetching orders", $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>