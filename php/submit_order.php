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
    
    $log_file = __DIR__ . '/logs/order_submission.log';
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp] $message";
    if ($data !== null) {
        $log_entry .= " | " . print_r($data, true);
    }
    $log_entry .= "\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

try {
    write_log("Order submission started", $_POST);
    
    $conn = new mysqli($host, $user, $pass, $db);
    if ($conn->connect_error) {
        write_log("Database connection failed", $conn->connect_error);
        die("error: Database connection failed: " . $conn->connect_error);
    }
    
    
    $conn->set_charset("utf8");

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get and validate required fields
        $firstName = trim($_POST['first_name'] ?? '');
        $lastName = trim($_POST['last_name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $city = trim($_POST['city'] ?? '');
        $street = trim($_POST['street'] ?? '');
        $apartment = trim($_POST['apartment'] ?? ''); 
        $shipping = trim($_POST['shipping'] ?? 'regular'); 
        $total = floatval($_POST['total'] ?? 0);
        $paymentStatus = trim($_POST['payment_status'] ?? 'pending');
        $cartItems = $_POST['cartItems'] ?? '[]';
        $paypalOrderId = trim($_POST['paypal_order_id'] ?? '');
        
        write_log("Parsed form data", [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'phone' => $phone,
            'city' => $city,
            'street' => $street,
            'apartment' => $apartment,
            'shipping' => $shipping,
            'total' => $total,
            'payment_status' => $paymentStatus,
            'paypal_order_id' => $paypalOrderId,
            'cart_items_length' => strlen($cartItems)
        ]);
        
        if (empty($firstName) || empty($lastName) || empty($email) || empty($phone)) {
            write_log("Missing required fields", [
                'first_name_empty' => empty($firstName),
                'last_name_empty' => empty($lastName),
                'email_empty' => empty($email),
                'phone_empty' => empty($phone)
            ]);
            die("error: Missing required fields - please fill in name, email and phone");
        }
        
        if ($total <= 0) {
            write_log("Invalid total amount", $total);
            die("error: Invalid total amount: $total");
        }
        
        
        $validShippingOptions = ['regular', 'express', 'pickup'];
        if (!in_array($shipping, $validShippingOptions)) {
            write_log("Invalid shipping option", $shipping);
            $shipping = 'regular'; 
        }
        
        
        $cartItemsArray = json_decode($cartItems, true);
        if (!is_array($cartItemsArray) || empty($cartItemsArray)) {
            write_log("Invalid or empty cart items");
            die("error: Invalid or empty cart items");
        }
        
        
        $userId = $_SESSION['user_id'] ?? null;
        
        write_log("Processing order with PayPal integration", [
            'user_id' => $userId,
            'email' => $email,
            'paypal_order_id' => $paypalOrderId
        ]);
        
        
        $conn->begin_transaction();
        
        try {
            $checkColumn = $conn->query("SHOW COLUMNS FROM orders LIKE 'paypal_order_id'");
            if ($checkColumn->num_rows == 0) {
                
                $conn->query("ALTER TABLE orders ADD COLUMN paypal_order_id VARCHAR(255) NULL");
                write_log("Added paypal_order_id column to orders table");
            }
            
            
            $stmt = $conn->prepare("
                INSERT INTO orders (
                    email, shipping, price, city, street, apartment, 
                    first_name, last_name, phone, status, paypal_order_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            $status = ($paymentStatus === 'paid') ? 'confirmed' : 'pending';
            
            write_log("About to bind parameters", [
                'email' => $email,
                'shipping' => $shipping, 
                'total' => $total,
                'city' => $city,
                'street' => $street,
                'apartment' => $apartment,
                'firstName' => $firstName,
                'lastName' => $lastName,
                'phone' => $phone,
                'status' => $status,
                'paypal_order_id' => $paypalOrderId
            ]);
            
            $stmt->bind_param(
                "ssdssisssss", 
                $email, $shipping, $total, $city, $street, $apartment,
                $firstName, $lastName, $phone, $status, $paypalOrderId
            );
            
            if (!$stmt->execute()) {
                throw new Exception("Execute failed: " . $stmt->error);
            }
            
            $orderNumber = $conn->insert_id;
            write_log("Main order inserted", ['order_number' => $orderNumber]);
            
            
            $cartItemsJson = json_encode($cartItemsArray, JSON_PRETTY_PRINT);
            $cartItemsFile = __DIR__ . '/logs/order_' . $orderNumber . '_items.json';
            file_put_contents($cartItemsFile, $cartItemsJson);
            
            write_log("Cart items stored", [
                'order_number' => $orderNumber,
                'items_count' => count($cartItemsArray),
                'file' => $cartItemsFile
            ]);
            
            
            $conn->commit();
            
            write_log("Order successfully saved", [
                'order_number' => $orderNumber,
                'email' => $email,
                'total' => $total,
                'status' => $status,
                'shipping' => $shipping,
                'paypal_order_id' => $paypalOrderId
            ]);
            
            echo "success";
            
        } catch (Exception $e) {
            
            $conn->rollback();
            throw $e;
        }
        
    } else {
        write_log("Invalid request method", $_SERVER['REQUEST_METHOD']);
        die("error: Invalid request method");
    }
    
} catch (Exception $e) {
    write_log("Exception in order submission", $e->getMessage());
    echo "error: " . $e->getMessage();
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>