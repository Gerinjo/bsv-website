<?php
// The public word puzzle is a small barrier, not an account password.
// Its approval lives exclusively in the server's HttpOnly session.
function bsvTrainerHasAccess($session, $now) {
    return isset($session['trainerAccessExpires'])
        && is_int($session['trainerAccessExpires'])
        && $session['trainerAccessExpires'] > $now;
}

function bsvTrainerAccessChallenge(&$session, $now) {
    if (!isset($session['trainerAccessChallenge']) || $session['trainerAccessChallenge']['expires'] <= $now) {
        $session['trainerAccessChallenge'] = array('nonce' => bin2hex(random_bytes(24)), 'expires' => $now + 600);
    }
    return $session['trainerAccessChallenge']['nonce'];
}

function bsvTrainerUnlockAccess(&$session, $input, $now) {
    $nonce = bsvTrainerAccessChallenge($session, $now);
    $blockedUntil = $session['trainerAccessBlockedUntil'] ?? 0;
    if ($blockedUntil > $now) {
        return array(429, array('ok' => false, 'code' => 'access_wait', 'nonce' => $nonce,
            'retryAfter' => $blockedUntil - $now, 'message' => 'Bitte warte kurz und versuche es dann erneut.'));
    }
    if ($blockedUntil !== 0) unset($session['trainerAccessAttempts'], $session['trainerAccessBlockedUntil']);
    $providedNonce = $input['nonce'] ?? null;
    $word = $input['word'] ?? null;
    $validNonce = is_string($providedNonce) && hash_equals($nonce, $providedNonce);
    $validWord = is_string($word) && strtolower(trim($word)) === 'fussball';
    if (!$validNonce || !$validWord) {
        $session['trainerAccessAttempts'] = ($session['trainerAccessAttempts'] ?? 0) + 1;
        if ($session['trainerAccessAttempts'] >= 5) {
            $session['trainerAccessBlockedUntil'] = $now + 60;
            return array(429, array('ok' => false, 'code' => 'access_wait', 'nonce' => $nonce,
                'retryAfter' => 60, 'message' => 'Bitte warte eine Minute und versuche es dann erneut.'));
        }
        if (!$validNonce) {
            return array(422, array('ok' => false, 'code' => 'access_challenge', 'nonce' => $nonce,
                'message' => 'Die Abfrage wurde erneuert. Bitte versuche es noch einmal.'));
        }
        $invalid = array();
        foreach (array(1, 3, 5, 7) as $index => $position) {
            if (!is_string($word) || strtolower($word[$position] ?? '') !== 'fussball'[$position]) $invalid[] = $index;
        }
        return array(422, array('ok' => false, 'code' => 'access_word', 'nonce' => $nonce,
            'invalidFields' => $invalid, 'message' => 'Das passt noch nicht ganz. Bitte prüfe die markierten Buchstaben.'));
    }
    $session['trainerAccessExpires'] = $now + 4 * 60 * 60;
    unset($session['trainerAccessChallenge'], $session['trainerAccessAttempts'], $session['trainerAccessBlockedUntil'], $session['captcha']);
    return array(200, array('ok' => true, 'granted' => true));
}
