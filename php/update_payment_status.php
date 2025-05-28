<?php

session_start();


$host = "localhost";
$db = "isinbalbe3_smartVase_db";
$user = "isinbalbe3_isinbalbe3";
$pass = "J33v,lSVyK0f";


function write_log($message, $data = null) {
    if (!file_exists(__DIR__ . '/logs')) {
        mkdir(__DIR__ . '/logs', 0755, true);
    }
    
    $log_file = __DIR__ . '/logs/payment_updates.log';
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp] $message";
    if ($data !== null) {
        $log_entry .= " | " . print_r($data, true);
    }
    $log_entry .= "\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

try {
    $conn = new mysqli($host, $user, $pass, $db);
    if ($conn->connect_error) {
        write_log("Database connection failed", $conn->connect_error);
        die("error: Database connection failed");
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $preOrderId = $_POST['pre_order_id'] ?? '';
        $paypalOrderId = $_POST['paypal_order_id'] ?? '';
        $paymentStatus = $_POST['payment_status'] ?? 'completed';
        
        write_log("Updating payment status", [
            'pre_order_id' => $preOrderId,
            'paypal_order_id' => $paypalOrderId,
            'payment_status' => $paymentStatus
        ]);
        
        if (empty($preOrderId)) {
            write_log("Missing pre_order_id");
            echo "error: Missing pre_order_id";
            exit;
        }
        
        $stmt = $conn->prepare("SELECT order_number FROM orders WHERE paypal_order_id = ? LIMIT 1");
        if (!$stmt) {
            write_log("Prepare failed", $conn->error);
            echo "error: Prepare failed";
            exit;
        }
        
        $stmt->bind_param("s", $preOrderId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            write_log("Order not found", $preOrderId);
            echo "error: Order not found";
            exit;
        }
        
        $order = $result->fetch_assoc();
        $orderNumber = $order['order_number'];
        
        $updateStmt = $conn->prepare("UPDATE orders SET status = ? WHERE order_number = ?");
        if (!$updateStmt) {
            write_log("Update prepare failed", $conn->error);
            echo "error: Update prepare failed";
            exit;
        }
        
        $newStatus = ($paymentStatus === 'completed') ? 'paid' : 'pending';
        $updateStmt->bind_param("si", $newStatus, $orderNumber);
        
        if ($updateStmt->execute()) {
            write_log("Payment status updated successfully", [
                'order_number' => $orderNumber,
                'new_status' => $newStatus,
                'paypal_order_id' => $paypalOrderId
            ]);
            
            $paypalLog = [
                'order_number' => $orderNumber,
                'pre_order_id' => $preOrderId,
                'paypal_order_id' => $paypalOrderId,
                'payment_status' => $paymentStatus,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            $paypalLogFile = __DIR__ . '/logs/paypal_transactions.log';
            file_put_contents($paypalLogFile, json_encode($paypalLog) . "\n", FILE_APPEND | LOCK_EX);
            
            echo "success";
        } else {
            write_log("Update execution failed", $updateStmt->error);
            echo "error: Update failed";
        }
        
    } else {
        echo "error: Method not allowed";
    }
    
} catch (Exception $e) {
    write_log("Exception occurred", $e->getMessage());
    echo "error: " . $e->getMessage();
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>