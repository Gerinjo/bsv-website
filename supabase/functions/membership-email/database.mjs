const isClockFailure = error => error?.code === 'PGRST303' && error?.message === 'JWT issued at future';
const recoverableRpcs = new Set(['newsletter_request_membership_topics', 'trainer_suite_onboarding_queue']);

// A gateway authentication rejection happens before SQL runs. Never replay a
// timeout, network failure, expired JWT, permission error or failed SQL write.
export function withMembershipDatabase(rest, connect) {
  const recover = async (request, operation) => {
    const result = await request;
    if (!connect || !isClockFailure(result.error)) return result;
    try {
      const data = await connect().begin(async sql => {
        await sql`set local role service_role`;
        return operation(sql);
      });
      return { data, error: null };
    } catch (error) {
      console.error('Mitgliedsantrags-Datenbankverbindung fehlgeschlagen:', { code: error?.code || 'connection-failed' });
      return result;
    }
  };
  return {
    from: table => rest.from(table),
    recipients(keys) {
      return recover(rest.from('contact_empfaenger').select('schluessel, email, weitere_emails').in('schluessel', keys).eq('aktiv', true),
        sql => sql`select schluessel, email, weitere_emails from public.contact_empfaenger where aktiv = true and schluessel = any(${keys}::text[])`);
    },
    rpc(name, args) {
      const request = rest.rpc(name, args);
      if (!recoverableRpcs.has(name)) return request;
      return recover(request, async sql => {
        const rows = name === 'trainer_suite_onboarding_queue'
          ? await sql`select public.trainer_suite_onboarding_queue(${sql.json(args.payload)}::jsonb) as data`
          : await sql`select public.newsletter_request_membership_topics(
              p_email => ${args.p_email}, p_mode => ${args.p_mode}, p_token_hash => ${args.p_token_hash},
              p_message => ${sql.json(args.p_message)}::jsonb, p_consent_version => ${args.p_consent_version},
              p_application_number => ${args.p_application_number}, p_topics => ${args.p_topics}::text[]) as data`;
        return rows[0]?.data ?? null;
      });
    },
  };
}
