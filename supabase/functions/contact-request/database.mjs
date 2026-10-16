const isClockFailure = error => error?.code === 'PGRST303' && error?.message === 'JWT issued at future';

// Only replay requests rejected during authentication, before PostgREST runs SQL.
// Network failures and all other errors must remain errors to avoid duplicate writes.
export function withContactDatabase(rest, connect) {
  const recover = async (request, operation) => {
    const result = await request;
    if (!isClockFailure(result.error)) return result;
    try {
      const data = await connect().begin(async sql => {
        // Keep the same privileges as the normal server-side REST client.
        await sql`set local role service_role`;
        return operation(sql);
      });
      return { data, error: null };
    } catch (error) {
      console.error('Kontakt-Datenbankverbindung fehlgeschlagen:', { code: error?.code || 'connection-failed' });
      return result;
    }
  };
  return {
    rpc(name, args) {
      return recover(rest.rpc(name, args), async sql => {
        if (name !== 'prepare_trainer_contact_lookup') throw new Error('Unsupported contact operation');
        const rows = await sql`select public.prepare_trainer_contact_lookup(${args.routing_key}) as data`;
        return rows[0]?.data ?? null;
      });
    },
    from(table) {
      let query = rest.from(table), operation = 'select', values, columns = '', filters = {}, pending;
      const chain = {
        insert(value) { operation = 'insert'; values = value; query = query.insert(value); return chain; },
        update(value) { operation = 'update'; values = value; query = query.update(value); return chain; },
        delete() { operation = 'delete'; query = query.delete(); return chain; },
        select(value) { columns = value; query = query.select(value); return chain; },
        eq(key, value) { filters[key] = value; query = query.eq(key, value); return chain; },
        lt(key, value) { filters['lt:' + key] = value; query = query.lt(key, value); return chain; },
        single() { query = query.single(); return chain; },
        maybeSingle() { query = query.maybeSingle(); return chain; },
        then(resolve, reject) {
          pending ??= recover(query, sql => contactQuery(sql, { table, operation, values, columns, filters }));
          return pending.then(resolve, reject);
        },
      };
      return chain;
    },
  };
}

async function contactQuery(sql, { table, operation, values, columns, filters }) {
  // Fixed SQL statements only. All form values remain bound parameters.
  if (table === 'contact_captcha_challenges') {
    if (operation === 'insert' && columns === 'id') {
      const rows = await sql`insert into public.contact_captcha_challenges (antwort) values (${values.antwort}) returning id`;
      return rows[0];
    }
    if (operation === 'delete' && filters.id && columns === 'antwort, expires_at') {
      const rows = await sql`delete from public.contact_captcha_challenges where id = ${filters.id} returning antwort, expires_at`;
      return rows[0] ?? null;
    }
    if (operation === 'delete' && filters['lt:expires_at'] && !columns) {
      await sql`delete from public.contact_captcha_challenges where expires_at < ${filters['lt:expires_at']}`;
      return null;
    }
  }
  if (table === 'contact_empfaenger' && operation === 'select' && filters.schluessel && filters.aktiv === true) {
    const rows = await sql`select email, weitere_emails, bezeichnung from public.contact_empfaenger where schluessel = ${filters.schluessel} and aktiv = true`;
    if (rows.length > 1) throw new Error('Ambiguous contact recipient');
    return rows[0] ?? null;
  }
  if (table === 'contact_anfragen') {
    if (operation === 'insert' && columns === 'id') {
      const payload = JSON.stringify({ ...values, empfaenger_emails: values.empfaenger_emails ?? [values.empfaenger_email] });
      const rows = await sql`insert into public.contact_anfragen
        (thema, routing_schluessel, anfrageart, empfaenger_email, empfaenger_emails, vorname, nachname, email, telefon, gegner_verein, gegner_mannschaft, nachricht, datenschutz_bestaetigt)
        select thema, routing_schluessel, anfrageart, empfaenger_email, empfaenger_emails, vorname, nachname, email, telefon, gegner_verein, gegner_mannschaft, nachricht, datenschutz_bestaetigt
        from jsonb_populate_record(null::public.contact_anfragen, ${payload}::jsonb) returning id`;
      return rows[0];
    }
    if (operation === 'update' && filters.id && !columns) {
      // A failed email must not clear a provider ID that was already recorded.
      await sql`update public.contact_anfragen set
        benachrichtigung_status = ${values.benachrichtigung_status},
        mail_modus = ${values.mail_modus},
        resend_id = case when ${Object.hasOwn(values, 'resend_id')} then ${values.resend_id ?? null} else resend_id end,
        benachrichtigung_fehler = ${values.benachrichtigung_fehler}
        where id = ${filters.id}`;
      return null;
    }
  }
  throw new Error('Unsupported contact operation');
}
