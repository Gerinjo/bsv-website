<?php
// Synthetic signature and application data only; no email is sent by this fixture.
require_once __DIR__ . '/../../public/api/membership-pdf.php';
require_once __DIR__ . '/../../public/api/foerderverein-pdf.php';
$payload = json_decode(stream_get_contents(STDIN), true);
echo ($payload['kind'] ?? '') === 'foerderverein'
    ? bsvBuildFoerdervereinPdf($payload['data'], base64_decode($payload['signature'], true))
    : bsvBuildMembershipPdf($payload['data'], base64_decode($payload['signature'], true));
