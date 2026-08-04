import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });

const text = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return json({ message: 'Diese Anfrage wird nicht unterstützt.' }, 405, origin);
  }

  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) {
    return json({ message: 'Diese Herkunft ist nicht zugelassen.' }, 403, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ message: 'Die Formulardaten sind ungültig.' }, 400, origin);
  }

  // Unsichtbares Feld für einfache Bots.
  if (text(body.website, 200)) {
    return json({ message: 'Vielen Dank! Die Anmeldung wurde gespeichert.' }, 201, origin);
  }

  const vorname = text(body.vorname, 80);
  const nachname = text(body.nachname, 80);
  const email = text(body.email, 200).toLowerCase();
  const telefon = text(body.telefon, 50);
  const selectedSchool = text(body.grundschule, 140);
  const otherSchool = text(body.andereGrundschule, 140);
  const grundschule = selectedSchool === 'Andere Grundschule' ? otherSchool : selectedSchool;
  const altersklasse = text(body.altersklasse, 80);
  const mannschaftsname = text(body.mannschaftsname, 120);
  const weitereInformationen = text(body.weitereInformationen, 1500);

  if (!vorname || !nachname || !email || !telefon || !grundschule || !altersklasse || !mannschaftsname) {
    return json({ message: 'Bitte fülle alle Pflichtfelder aus.' }, 400, origin);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ message: 'Bitte gib eine gültige E-Mail-Adresse ein.' }, 400, origin);
  }

  if (body.turniergebuehr !== true || body.datenschutz !== true) {
    return json({ message: 'Bitte bestätige Beteiligung und Datenschutz.' }, 400, origin);
  }

  const allowedCompetitions = new Set([
    'Mix 1. & 2. Klasse',
    'Mädchen 1. & 2. Klasse',
    'Mix 3. & 4. Klasse',
    'Mädchen 3. & 4. Klasse',
  ]);

  if (!allowedCompetitions.has(altersklasse)) {
    return json({ message: 'Die gewählte Altersklasse ist ungültig.' }, 400, origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase-Konfiguration fehlt.');
    return json({ message: 'Die Anmeldung ist momentan nicht verfügbar.' }, 500, origin);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from('gst_anmeldungen').insert({
    vorname,
    nachname,
    email,
    telefon,
    grundschule,
    altersklasse,
    mannschaftsname,
    weitere_informationen: weitereInformationen || null,
    beteiligung_bestaetigt: true,
    datenschutz_bestaetigt: true,
  });

  if (error?.code === '23505') {
    return json({ message: 'Diese Mannschaft wurde offenbar bereits angemeldet.' }, 409, origin);
  }

  if (error) {
    console.error(error);
    return json({ message: 'Die Anmeldung konnte nicht gespeichert werden.' }, 500, origin);
  }

  return json({ message: 'Vielen Dank! Die Mannschaft wurde erfolgreich angemeldet.' }, 201, origin);
});
