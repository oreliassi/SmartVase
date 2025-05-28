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

// NEW: Check Admin Session - for protecting admin pages
if (isset($_GET['checkAdminSession']) && $_GET['checkAdminSession'] == 1) {
    try {
        // Check if session indicates admin user
        if (!isset($_SESSION['is_admin']) || !isset($_SESSION['user_email']) || $_SESSION['is_admin'] !== true) {
            echo 'not_authenticated';
            exit;
        }
        
        // Double-check in database that user is still admin
        $email = $_SESSION['user_email'];
        $stmt = $conn->prepare("SELECT type FROM users WHERE email = ?");
        
        if (!$stmt) {
            echo 'query_error';
            exit;
        }
        
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 1) {
            $userData = $result->fetch_assoc();
            if ($userData['type'] === 'Admin') {
                echo 'authenticated_admin';
            } else {
                // User exists but is not admin
                session_destroy();
                echo 'not_admin';
            }
        } else {
            // User not found in database
            session_destroy();
            echo 'user_not_found';
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        error_log("Admin session check error: " . $e->getMessage());
        echo 'error';
    }
    
    $conn->close();
    exit;
}

// Get User Info - for filling forms
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

// Get User Orders
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

// ADMIN LOGIN - Handle admin authentication
if (isset($_POST['isAdminLogin']) && $_POST['isAdminLogin'] == 1) {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
    
    if (empty($email) || empty($password)) {
        echo "missing_credentials";
        $conn->close();
        exit;
    }
    
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND password = ?");
    
    if (!$stmt) {
        echo "query_error";
        $conn->close();
        exit;
    }
    
    $stmt->bind_param("ss", $email, $password);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        if ($user['type'] === 'Admin') {
            // SUCCESS - User is admin
            $_SESSION['user_email'] = $email;
            $_SESSION['is_admin'] = true;
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
            
            echo "admin_success";
        } else {
            // User exists but is not admin
            echo "not_admin";
        }
    } else {
        // Invalid credentials
        echo "fail";
    }
    
    $stmt->close();
    $conn->close();
    exit;
}

// REGULAR USER LOGIN - Handle regular user authentication
if (!isset($_POST['isAdminLogin']) && isset($_POST['email']) && isset($_POST['password'])) {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
    
    if (empty($email) || empty($password)) {
        echo json_encode(["status" => "fail", "message" => "Missing credentials"]);
        $conn->close();
        exit;
    }
    
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND password = ?");
    $stmt->bind_param("ss", $email, $password);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $userData = $result->fetch_assoc();
        $_SESSION['user_email'] = $email;
        $_SESSION['user_id'] = $userData['user_id'];
        
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

// GET ORDER DETAILS - for order management
if (isset($_GET['getOrderDetails'])) {
    header('Content-Type: application/json');
    
    $orderNumber = $_GET['getOrderDetails'];
    
    try {
        // Get main order details
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
        
        // Get order models/items
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
        
        $orderData['models'] = $models;
        
        echo json_encode($orderData, JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        echo json_encode(["error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    
    exit;
}

$conn->close();
?>