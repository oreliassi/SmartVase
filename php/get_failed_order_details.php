<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}


$host = "localhost";
$db = "isinbalbe3_smartVase_db";
$user = "isinbalbe3_isinbalbe3";
$pass = "J33v,lSVyK0f";

try {
    $conn = new mysqli($host, $user, $pass, $db);
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8");

    $order_number = isset($_GET['order_number']) ? trim($_GET['order_number']) : '';
    $action = isset($_GET['action']) ? $_GET['action'] : 'search';

    if ($action === 'search' && !empty($order_number)) {
       
        $stmt = $conn->prepare("
            SELECT 
                order_number,
                email,
                first_name,
                last_name,
                phone,
                city,
                street,
                apartment,
                shipping,
                price,
                status,
                date
            FROM orders 
            WHERE order_number = ?
        ");
        
        $stmt->bind_param("s", $order_number);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
           
            $failureDetails = [
                '1002' => [
                    'defectType' => 'spaghetti',
                    'defectName' => 'Spaghetti Error',
                    'printTime' => '2:45:30',
                    'failureTime' => '1:23:15',
                    'materialUsed' => 'PLA - כתום',
                    'failureReason' => 'טמפרטורה גבוהה גרמה לזליגות וחוטים דקים',
                    'nozzleTemp' => 215,
                    'bedTemp' => 57,
                    'printSpeed' => 62,
                    'materialWasted' => 45,
                    'costLoss' => 41.15
                ],
                '1003' => [
                    'defectType' => 'layer',
                    'defectName' => 'Layer Shifting', 
                    'printTime' => '3:12:45',
                    'failureTime' => '0:45:20',
                    'materialUsed' => 'PLA - ירוק',
                    'failureReason' => 'חגורות רפויות גרמו לתזוזת שכבות',
                    'nozzleTemp' => 200,
                    'bedTemp' => 55,
                    'printSpeed' => 65,
                    'materialWasted' => 38,
                    'costLoss' => 35.80
                ]
            ];
            
           
            if (isset($failureDetails[$order_number])) {
                $failure = $failureDetails[$order_number];
                
                $response = [
                    'success' => true,
                    'data' => [
                        'orderNumber' => $row['order_number'],
                        'defectType' => $failure['defectType'],
                        'defectName' => $failure['defectName'],
                        'date' => $row['date'],
                        'customer' => trim($row['first_name'] . ' ' . $row['last_name']),
                        'printTime' => $failure['printTime'],
                        'failureTime' => $failure['failureTime'],
                        'materialUsed' => $failure['materialUsed'],
                        'failureReason' => $failure['failureReason'],
                        'nozzleTemp' => $failure['nozzleTemp'],
                        'bedTemp' => $failure['bedTemp'],
                        'printSpeed' => $failure['printSpeed'],
                        'materialWasted' => $failure['materialWasted'],
                        'costLoss' => $failure['costLoss'],
                        'email' => $row['email'],
                        'phone' => $row['phone'],
                        'address' => trim($row['city'] . ' ' . $row['street'] . ' ' . $row['apartment']),
                        'shipping' => $row['shipping'],
                        'totalPrice' => $row['price'],
                        'status' => $row['status'],
                        'reportPath' => $order_number === '1003' ? "reports/order_1003_layer_report.pdf" : "reports/order_{$row['order_number']}_" . strtolower($failure['defectType']) . "_report.pdf"
                    ]
                ];
            } else {
                
                $response = [
                    'success' => false,
                    'message' => 'Order found but no failure details available'
                ];
            }
            
            echo json_encode($response);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Order not found'
            ]);
        }
        
    } else if ($action === 'get_all') {
        
        $failed_orders = [
            [
                'orderNumber' => '1002',
                'defectName' => 'Spaghetti Error',
                'customer' => 'אור אליאסי',
                'date' => '2025-04-12'
            ],
            [
                'orderNumber' => '1003', 
                'defectName' => 'Layer Shifting',
                'customer' => 'ענבל בן אלי',
                'date' => '2025-04-01'
            ]
        ];
        
        echo json_encode([
            'success' => true,
            'data' => $failed_orders
        ]);
        
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid request'
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>