<?php
/**
 * TruckLog Pro - PHP API for XAMPP
 * Handles JSON data persistence to database.json
 */

$db_file = 'database.json';
$action = $_GET['action'] ?? '';

// Set headers for JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['REQUEST_URI'], 'save') !== false) {
    // SAVE DATA
    $json_data = file_get_contents('php://input');
    
    // Validate JSON
    if (json_decode($json_data) !== null) {
        if (file_put_contents($db_file, $json_data)) {
            echo json_encode(['status' => 'success']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Could not write to file. Check folder permissions.']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data']);
    }
    exit;
} 

if ($_SERVER['REQUEST_METHOD'] === 'GET' && strpos($_SERVER['REQUEST_URI'], 'load') !== false) {
    // LOAD DATA
    if (file_exists($db_file)) {
        echo file_get_contents($db_file);
    } else {
        // Return default empty structure
        echo json_encode([
            "settings" => (object)[],
            "trips" => [],
            "ledger" => [],
            "trucks" => [],
            "drivers" => [],
            "fines" => [],
            "fuelLog" => []
        ]);
    }
    exit;
}

// If no action matched
echo json_encode(['message' => 'TruckLog API is active. Use /api.php?action=load or POST to /api.php?action=save']);
?>
