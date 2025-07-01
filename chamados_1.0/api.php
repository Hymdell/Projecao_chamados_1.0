<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($method === 'GET') {
    $filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
    
    $sql = "SELECT * FROM tickets";

    if ($filter === 'active') {
        $sql .= " WHERE status = 'aberto'";
    } elseif ($filter === 'completed') {
        $sql .= " WHERE status = 'concluido'";
    }

    $sql .= " ORDER BY id DESC";
    
    $result = $conn->query($sql);
    $tickets = [];

    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $row['completed'] = ($row['status'] === 'concluido');
            $row['checklist'] = json_decode($row['checklist']) ?? [];
            $row['date'] = $row['criado_em'];
            $row['location'] = $row['local'];
            $row['user'] = $row['usuario'];
            $row['asset'] = $row['patrimonio'];
            $row['technician'] = $row['tecnico'];
            $row['problem'] = $row['problema'];
            $row['solution'] = $row['solucao'];
            
            unset(
                $row['criado_em'], 
                $row['local'], 
                $row['usuario'], 
                $row['patrimonio'], 
                $row['tecnico'], 
                $row['problema'], 
                $row['solucao'],
                $row['status']
            );
            
            $tickets[] = $row;
        }
    }
    
    echo json_encode($tickets);

} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    switch ($action) {
        case 'create':
            $location = $data['location'] ?? '';
            $user = $data['user'] ?? '';
            $ip = $data['ip'] ?? '';
            $asset = $data['asset'] ?? '';
            $technician = $data['technician'] ?? '';
            $problem = $data['problem'] ?? '';
            $checklistJson = json_encode($data['checklist'] ?? []);
            $status = 'aberto';

            $sql = $conn->prepare("INSERT INTO tickets (local, usuario, ip, patrimonio, tecnico, problema, checklist, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $sql->bind_param("ssssssss", $location, $user, $ip, $asset, $technician, $problem, $checklistJson, $status);
            
            if ($sql->execute()) {
                echo json_encode(['success' => true, 'message' => 'Chamado criado com sucesso.', 'id' => $conn->insert_id]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Erro ao criar chamado.']);
            }
            $sql->close();
            break;

        case 'update':
            $id = $data['id'] ?? null;
            $location = $data['location'] ?? '';
            $user = $data['user'] ?? '';
            $ip = $data['ip'] ?? '';
            $asset = $data['asset'] ?? '';
            $technician = $data['technician'] ?? '';
            $problem = $data['problem'] ?? '';
            $solution = $data['solution'] ?? '';
            $status = !empty($data['completed']) ? 'concluido' : 'aberto';
            $checklistJson = json_encode($data['checklist'] ?? []);

            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'ID do chamado não fornecido.']);
                break;
            }

            $sql = $conn->prepare("UPDATE tickets SET local = ?, usuario = ?, ip = ?, patrimonio = ?, tecnico = ?, problema = ?, solucao = ?, checklist = ?, status = ? WHERE id = ?");
            $sql->bind_param("sssssssssi", $location, $user, $ip, $asset, $technician, $problem, $solution, $checklistJson, $status, $id);

            if ($sql->execute()) {
                echo json_encode(['success' => true, 'message' => 'Chamado atualizado com sucesso.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Erro ao atualizar chamado: ' . $sql->error]);
            }
            $sql->close();
            break;
            
        case 'delete':
            $id = $data['id'] ?? null;
            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'ID do chamado não fornecido.']);
                break;
            }
            $sql = $conn->prepare("DELETE FROM tickets WHERE id = ?");
            $sql->bind_param("i", $id);

            if ($sql->execute()) {
                echo json_encode(['success' => true, 'message' => 'Chamado excluído com sucesso.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Erro ao excluir chamado.']);
            }
            $sql->close();
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Ação inválida.']);
            break;
    }
}

$conn->close();
?>