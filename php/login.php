<?php
session_start();
$host = "localhost";
$db = "smartvase_db";
$user = "your_db_user";
$pass = "your_db_pass";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$email = $_POST['email'];
$password = $_POST['password'];

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
$conn->close();
?>
