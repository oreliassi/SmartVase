<?php
session_start();

$host = "localhost";
$db = "isinbalbe3_smartVase_db";
$user = "isinbalbe3_isinbalbe3";
$pass = "J33v,lSVyK0f";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Get user details
if (isset($_GET['getUser']) && $_GET['getUser'] == 1) {
    if (isset($_SESSION['user_email'])) {
        $email = $_SESSION['user_email'];
        $stmt = $conn->prepare("SELECT first_name, last_name, email, phone FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            echo json_encode($result->fetch_assoc());
        } else {
            echo json_encode(null);
        }
    } else {
        echo json_encode(null);
    }
    $conn->close();
    exit;
}

// Get order history
if (isset($_GET['getOrders']) && $_GET['getOrders'] == 1) {
    // ודא שרק JSON נשלח חזרה
    header('Content-Type: application/json'); 
    
    if (isset($_SESSION['user_email'])) {
        $email = $_SESSION['user_email'];
        
        try {
            // שאילתה פשוטה יותר - רק טבלת orders
            $stmt = $conn->prepare("SELECT * FROM orders WHERE email = ?");
            if (!$stmt) {
                throw new Exception("Query preparation failed: " . $conn->error);
            }
            
            $stmt->bind_param("s", $email);
            if (!$stmt->execute()) {
                throw new Exception("Query execution failed: " . $stmt->error);
            }
            
            $result = $stmt->get_result();
            $orders = [];
            while ($row = $result->fetch_assoc()) {
                $orders[] = $row;
            }
            
            // בדוק את ה-JSON לפני שליחה
            $json = json_encode($orders, JSON_UNESCAPED_UNICODE);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("JSON encoding error: " . json_last_error_msg());
            }
            
            echo $json;
        } catch (Exception $e) {
            echo json_encode(["error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    } else {
        echo json_encode(["error" => "No active session"], JSON_UNESCAPED_UNICODE);
    }
    $conn->close();
    exit;
}

// Regular login
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

$stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND password = ?");
$stmt->bind_param("ss", $email, $password);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $_SESSION['user_email'] = $email;
    echo "success";
} else {
    echo "fail";
}

// Get order details with models
if (isset($_GET['getOrderDetails'])) {
    // Set content type to JSON
    header('Content-Type: application/json');
    
    $orderId = $_GET['getOrderDetails'];
    
    try {
        // First get the order information
        $stmt = $conn->prepare("SELECT * FROM orders WHERE order_number = ?");
        if (!$stmt) {
            throw new Exception("Query preparation failed: " . $conn->error);
        }
        
        $stmt->bind_param("i", $orderId);
        if (!$stmt->execute()) {
            throw new Exception("Query execution failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            echo json_encode(["error" => "Order not found"], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        $orderData = $result->fetch_assoc();
        
        // Now get the models for this order
        $modelStmt = $conn->prepare("
            SELECT om.order_id, om.model_id, m.model_number, m.height, m.width, m.color, m.texture
            FROM order_models om
            JOIN models m ON om.model_id = m.model_id
            WHERE om.order_id = ?
        ");
        
        if (!$modelStmt) {
            throw new Exception("Model query preparation failed: " . $conn->error);
        }
        
        $modelStmt->bind_param("i", $orderId);
        if (!$modelStmt->execute()) {
            throw new Exception("Model query execution failed: " . $modelStmt->error);
        }
        
        $modelResult = $modelStmt->get_result();
        $models = [];
        
        while ($modelRow = $modelResult->fetch_assoc()) {
            // The model data is already complete from our JOIN query
            $models[] = $modelRow;
        }
        
        // Add models to order data
        $orderData['models'] = $models;
        
        // Return the complete data
        echo json_encode($orderData, JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        echo json_encode(["error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    
    exit;
}

$conn->close();
?>