<?php

header('Content-Type: application/json');

$testTickets = [
    [
        "id" => 999,
        "location" => "Sala de Teste",
        "user" => "Usuário Teste",
        "ip" => "192.168.1.1",
        "asset" => "TESTE01",
        "technician" => "Admin",
        "problem" => "Este é um chamado de teste para verificar se o JSON está sendo enviado corretamente.",
        "solution" => "",
        "checklist" => [],
        "completed" => false,
        "date" => "2025-06-17 10:30:00"
    ]
];

echo json_encode($testTickets);

exit();