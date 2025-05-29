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

if (isset($_GET['checkAdminSession']) && $_GET['checkAdminSession'] == 1) {
    try {
        if (!isset($_SESSION['is_admin']) || !isset($_SESSION['user_email']) || $_SESSION['is_admin'] !== true) {
            echo 'not_authenticated';
            exit;
        }
        
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
                session_destroy();
                echo 'not_admin';
            }
        } else {
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
            $_SESSION['user_email'] = $email;
            $_SESSION['is_admin'] = true;
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
            
            echo "admin_success";
        } else {
            echo "not_admin";
        }
    } else {
        echo "fail";
    }
    
    $stmt->close();
    $conn->close();
    exit;
}

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

if (isset($_GET['getOrderDetails'])) {
    header('Content-Type: application/json');
    
    $orderNumber = $_GET['getOrderDetails'];
    
    try {
        
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
        
        $modelStmt = $conn->prepare("
            SELECT om.order_id, om.model_id, m.model_number, m.height, m.width, m.color, m.texture
            FROM order_models om
            JOIN models m ON om.model_id = m.model_id
            WHERE om.order_id = ?
        ");
        
        $models = [];
        
        if ($modelStmt) {
            $modelStmt->bind_param("i", $orderNumber);
            if ($modelStmt->execute()) {
                $modelResult = $modelStmt->get_result();
                
                while ($modelRow = $modelResult->fetch_assoc()) {
                    if (isset($modelRow['height'])) {
                        $modelRow['height'] = (int)$modelRow['height'];
                    }
                    if (isset($modelRow['width'])) {
                        $modelRow['width'] = (int)$modelRow['width'];
                    }
                    
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
            }
        }
        
        if (empty($models)) {
            $cartItemsFile = __DIR__ . '/logs/order_' . $orderNumber . '_items.json';
            if (file_exists($cartItemsFile)) {
                $cartItemsJson = file_get_contents($cartItemsFile);
                $cartItems = json_decode($cartItemsJson, true);
                
                if ($cartItems && is_array($cartItems)) {
                    foreach ($cartItems as $item) {
                        $modelPath = $item['model'] ?? 'models/vase1.stl';
                        
                        if (!strstr($modelPath, 'models/')) {
                            $modelPath = 'models/' . $modelPath;
                        }
                        if (!strstr($modelPath, '.stl')) {
                            $modelPath = $modelPath . '.stl';
                        }
                        
                        $models[] = [
                            'model_number' => $modelPath,
                            'height' => intval($item['height'] ?? 15),
                            'width' => intval($item['width'] ?? 15),
                            'color' => $item['color'] ?? '#f14a4a',
                            'texture' => $item['texture'] ?? 'smooth'
                        ];
                    }
                }
            }
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
