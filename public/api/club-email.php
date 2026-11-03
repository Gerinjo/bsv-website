<?php
// Shared HTML is generated from the same club-email.mjs used by both Supabase projects.
function bsvClubEmailPartners($records) {
    $result = array();
    foreach (is_array($records) ? $records : array() as $s) {
        if (!is_array($s) || empty($s['id']) || empty($s['name']) || empty($s['logo']) || empty($s['website'])) continue;
        $logo = parse_url($s['logo']); $url = parse_url($s['website']);
        if (!$logo || ($logo['scheme'] ?? '') !== 'https' || ($logo['host'] ?? '') !== 'bsvnordstern.de' || isset($logo['user']) || isset($logo['pass']) || strpos($logo['path'] ?? '', '/images/sponsors/') !== 0 || !$url || !in_array($url['scheme'] ?? '', array('https','http'), true) || isset($url['user']) || isset($url['pass'])) continue;
        if (!isset($s['width'],$s['height']) || !is_int($s['width']) || !is_int($s['height']) || $s['width']<1 || $s['width']>112 || $s['height']<1 || $s['height']>64) continue;
        $result[$s['id']] = array_intersect_key($s,array_flip(array('id','name','website','logo','width','height')));
    }
    return array_values($result);
}
function bsvClubEmailSponsorSnapshot($key) {
    $directory = __DIR__ . '/.club-email-public-cache';
    if (!is_dir($directory)) @mkdir($directory,0700,true);
    $path = $directory . '/' . hash('sha256',$key) . '.json';
    if (is_link($path)) return array();
    $file = @fopen($path,'c+');
    if (!$file || !flock($file,LOCK_EX)) { if ($file) fclose($file); return array(); }
    @chmod($path,0600);
    try {
        $cached = json_decode(stream_get_contents($file),true);
        if (is_array($cached) && ($cached['created'] ?? 0)>time()-172800 && isset($cached['sponsors']) && is_array($cached['sponsors'])) return array_slice(bsvClubEmailPartners($cached['sponsors']),0,4);
        $context=stream_context_create(array('http'=>array('timeout'=>4,'header'=>"Accept: application/json\r\n")));
        $raw=@file_get_contents('https://bsvnordstern.de/mitgliedschaft-sponsoren.json',false,$context,0,131072);
        $feed=is_string($raw)?json_decode($raw,true):null;
        $pool=bsvClubEmailPartners(is_array($feed)?($feed['sponsors']??array()):array());shuffle($pool);$selected=array_slice($pool,0,4);
        ftruncate($file,0);rewind($file);fwrite($file,json_encode(array('created'=>time(),'sponsors'=>$selected),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));fflush($file);
        // Only public selections are retained. Bound the cache without touching other files.
        foreach (glob($directory.'/*.json')?:array() as $old) if ($old!==$path && !is_link($old) && filemtime($old)<time()-172800) @unlink($old);
        return $selected;
    } finally { flock($file,LOCK_UN);fclose($file); }
}
function bsvClubEmailDecorate($message,$key,$sponsors=null) {
    $template=@file_get_contents(__DIR__.'/club-email-template.html');if (!is_string($template)) return $message;
    $e=function($v){return htmlspecialchars((string)$v,ENT_QUOTES,'UTF-8');};
    $partners=$sponsors===null?bsvClubEmailSponsorSnapshot($key):array_slice(bsvClubEmailPartners($sponsors),0,4);
    $cells='';$text="\n\nUNSERE VEREINSSPONSOREN\n";
    foreach ($partners as $s) {$cells.='<td width="25%" align="center" valign="middle" style="padding:8px 4px;background:#ffffff;overflow-wrap:anywhere;"><a href="'.$e($s['website']).'" style="display:block;color:#164f32;text-decoration:none;"><img src="'.$e($s['logo']).'" alt="'.$e($s['name']).'" width="'.$s['width'].'" height="'.$s['height'].'" style="display:block;width:100%;max-width:'.$s['width'].'px;height:auto;border:0;margin:0 auto 8px;"><span style="display:block;max-width:112px;margin:auto;font-size:11px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'.$e($s['name']).'</span></a></td>';$text.=$s['name'].': '.$s['website']."\n";}
    $footer='<tr data-bsv-email-sponsors="club"><td class="bsv-email-sponsors" style="padding:24px;background:#f8faf8;border-top:3px solid #f4d638;text-align:center;"><h2 style="margin:0 0 14px;color:#164f32;font-size:20px;">Unsere Vereinssponsoren</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;"><tr>'.$cells.'</tr></table><p style="margin:16px 0 0;font-size:13px;line-height:1.5;">Danke für eure Unterstützung! <a href="https://bsvnordstern.de/werbepartner" style="color:#164f32;font-weight:700;">Alle Vereinssponsoren ansehen →</a></p></td></tr>';
    $message['html']=strtr($template,array('{{TITLE}}'=>$e($message['subject']),'{{BODY}}'=>nl2br($e($message['text'])),'{{SPONSORS}}'=>$footer));
    $message['text'].=$text.'Danke für eure Unterstützung! Alle Vereinssponsoren: https://bsvnordstern.de/werbepartner';return $message;
}
function bsvClubEmailAlternative($message) {
    $boundary='bsv_'.bin2hex(random_bytes(16));
    return array('header'=>"MIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"".$boundary."\"\r\n",
        'body'=>'--'.$boundary."\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n".$message['text']."\r\n--".$boundary."\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n".$message['html']."\r\n--".$boundary."--\r\n");
}
