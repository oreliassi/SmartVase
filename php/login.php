<?php
// The entire PHP file should be replaced with this version with proper fixes
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

        echo json_encode($result->fetch_assoc() ?: null);
    } else {
        echo json_encode(null);
    }
    $conn->close();
    exit;
}

// Get order history
if (isset($_GET['getOrders']) && $_GET['getOrders'] == 1) {
    header('Content-Type: application/json');
    if (isset($_SESSION['user_email'])) {
        $email = $_SESSION['user_email'];
        $stmt = $conn->prepare("SELECT * FROM orders WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        $orders = [];
        while ($row = $result->fetch_assoc()) {
            $orders[] = $row;
        }
        echo json_encode($orders, JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(["error" => "No active session"]);
    }
    $conn->close();
    exit;
}

// Admin login check
if (isset($_POST['isAdminLogin']) && $_POST['isAdminLogin'] == 1) {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND password = ?");
    $stmt->bind_param("ss", $email, $password);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        if ($user['type'] === 'Admin') {
            $_SESSION['user_email'] = $email;
            $_SESSION['is_admin'] = true;
            echo "admin_success";
        } else {
            echo "not_admin";
        }
    } else {
        echo "fail";
    }
    $conn->close();
    exit;
}

// Regular login (only if not admin login)
if (!isset($_POST['isAdminLogin']) && isset($_POST['email']) && isset($_POST['password'])) {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND password = ?");
    $stmt->bind_param("ss", $email, $password);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $userData = $result->fetch_assoc();
        $_SESSION['user_email'] = $email;
        echo json_encode([
            "status" => "success",
            "type" => $userData['type']
        ]);
    } else {
        echo json_encode(["status" => "fail"]);
    }
    $conn->close();
    exit;
}

// Get order details with models
if (isset($_GET['getOrderDetails'])) {
    header('Content-Type: application/json');
    
    $orderNumber = $_GET['getOrderDetails'];
    
    try {
        // First get the order information
        $stmt = $conn->prepare("SELECT * FROM orders WHERE order_number = ?");
        if (!$stmt) {
            throw new Exception("Query preparation failed: " . $conn->error);
        }
        
        $stmt->bind_param("i", $orderNumber);
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
        
        $modelStmt->bind_param("i", $orderNumber);
        if (!$modelStmt->execute()) {
            throw new Exception("Model query execution failed: " . $modelStmt->error);
        }
        
        $modelResult = $modelStmt->get_result();
        $models = [];
        
        while ($modelRow = $modelResult->fetch_assoc()) {
        // Ensure heights and widths are integers
        if (isset($modelRow['height'])) {
            $modelRow['height'] = (int)$modelRow['height'];
        }
        if (isset($modelRow['width'])) {
            $modelRow['width'] = (int)$modelRow['width'];
        }
        
        // Ensure model path is correctly formatted
        if (isset($modelRow['model_number']) && !empty($modelRow['model_number'])) {
            if (!strstr($modelRow['model_number'], 'models/')) {
                $modelRow['model_number'] = 'models/' . $modelRow['model_number'];
            }
            if (!strstr($modelRow['model_number'], '.stl')) {
                $modelRow['model_number'] = $modelRow['model_number'] . '.stl';
            }
        }
        
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