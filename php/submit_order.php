<?php
// submit_order.php - Save orders to the database
session_start();

// Database connection
$host = "localhost";
$db = "isinbalbe3_smartVase_db";
$user = "isinbalbe3_isinbalbe3";
$pass = "J33v,lSVyK0f";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

// Handle POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Get form data and cart items
        $orderData = $_POST['orderData'] ?? '';
        $cartItems = isset($_POST['cartItems']) ? json_decode($_POST['cartItems'], true) : [];
        $total = isset($_POST['total']) ? floatval($_POST['total']) : 0;
        
        // Create order number (timestamp)
        $orderNumber = time();
        
        // Extract form data
        $formValues = [];
        parse_str($orderData, $formValues);
        
        // Prepare variables for binding - THIS IS THE FIX
        $firstName = $formValues['first_name'] ?? '';
        $lastName = $formValues['last_name'] ?? '';
        $email = $formValues['email'] ?? '';
        $phone = $formValues['phone'] ?? '';
        $city = $formValues['city'] ?? '';
        $street = $formValues['street'] ?? '';
        $apartment = intval($formValues['apartment'] ?? 0);
        $shippingType = $formValues['shipping_type'] ?? 'regular';
        
        // Insert order into database
        $stmt = $conn->prepare("
            INSERT INTO orders 
            (order_number, first_name, last_name, email, phone, city, street, apartment, shipping, price, date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'pending')
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        // Use the variables instead of direct values
        $stmt->bind_param(
            "issssssisi",
            $orderNumber,
            $firstName,
            $lastName,
            $email,
            $phone,
            $city,
            $street,
            $apartment,
            $shippingType,
            $total
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Error inserting order: " . $stmt->error);
        }
        
        // Insert each model and link to order
        foreach ($cartItems as $item) {
            // First create model entry
            $modelStmt = $conn->prepare("
                INSERT INTO models
                (model_number, height, width, color, texture) 
                VALUES (?, ?, ?, ?, ?)
            ");
            
            if (!$modelStmt) {
                throw new Exception("Prepare model statement failed: " . $conn->error);
            }
            
            // Clean the model path to just get the base filename
            $modelNumber = str_replace('models/', '', str_replace('.stl', '', $item['model']));
            
            // Convert height and width to integers
            $height = intval($item['height']);
            $width = intval($item['width']);
            $color = $item['color'];
            $texture = $item['texture'];
            
            $modelStmt->bind_param(
                "siiss",
                $modelNumber,
                $height,
                $width,
                $color,
                $texture
            );
            
            if (!$modelStmt->execute()) {
                throw new Exception("Error inserting model: " . $modelStmt->error);
            }
            
            $modelId = $modelStmt->insert_id;
            
            // Create relationship between order and model
            $linkStmt = $conn->prepare("
                INSERT INTO order_models 
                (order_id, model_id) 
                VALUES (?, ?)
            ");
            
            if (!$linkStmt) {
                throw new Exception("Prepare link statement failed: " . $conn->error);
            }
            
            $linkStmt->bind_param("ii", $orderNumber, $modelId);
            
            if (!$linkStmt->execute()) {
                throw new Exception("Error linking order and model: " . $linkStmt->error);
            }
        }
        
        // Success response
        echo "success";
        
    } catch (Exception $e) {
        // Error response
        echo "error: " . $e->getMessage();
    }
} else {
    // Method not allowed
    header("HTTP/1.1 405 Method Not Allowed");
    echo "Method Not Allowed";
}

$conn->close();
?>