import { berlinToday, parseGermanDate, formatGermanDate } from '../../supabase/functions/_shared/form-dates.mjs';
import { normalizeIban, isValidIban } from '../utils/bankDetails.mjs';

export const initTrainerOnboardingForm = (form) => {
  const fields = [...form.querySelectorAll('[data-entry-fields]')];
  const get = (name) => form.elements.namedItem(name);
  const submit = form.querySelector('[type="submit"]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const reload = form.querySelector('[data-captcha-reload]');
  const question = form.querySelector('[data-captcha-question]');
  const status = form.querySelector('[data-form-status]');
  const help = form.querySelector('[data-contact-help]');
  const application = form.querySelector('[data-membership-application]');
  const guardian = form.querySelector('[data-guardian-fields]');
  const busApplication = form.querySelector('[data-bus-application]');
  const busAgeHint = form.querySelector('[data-bus-age-hint]');
  const busMinimumAge = Number(form.dataset.busMinimumAge);
  const uploadNames = ['idFront','idBack','licenseFront','licenseBack'];
  const canvas = form.querySelector('[data-signature-pad]');
  const clearSignature = form.querySelector('[data-signature-clear]');
  const context = canvas.getContext('2d');
  let captchaReady = false;
  let busy = false;
  let finished = false;
  let loadingCaptcha = false;
  let drawing = false;
  let strokeLength = 0;
  let previousPoint;
  let signed = false;
  let signerIsMinor = false;
  const signatureRequiredMessage = 'Bitte unterschreibe die Trainerunterlagen im Unterschriftenfeld am Ende des Formulars.';

  get('signingDate').value = formatGermanDate(berlinToday());
  const age = () => {
    const birth = parseGermanDate(get('birthDate').value);
    const today = berlinToday();
    return birth ? Number(today.slice(0,4)) - Number(birth.slice(0,4)) - (today.slice(5) < birth.slice(5) ? 1 : 0) : null;
  };
  const isMinor = () => age() !== null && age() < 18;
  const updateState = () => {
    fields.forEach((field) => { field.disabled = busy || finished; });
    const needsApplication = get('membership').value === 'no';
    application.hidden = !needsApplication;
    form.querySelector('[data-signature-membership-hint]').hidden = !needsApplication;
    application.querySelectorAll('input').forEach((input) => {
      input.disabled = busy || finished || !needsApplication;
      input.required = needsApplication && input.hasAttribute('data-membership-required');
    });
    const minor = isMinor();
    guardian.hidden = !minor;
    guardian.querySelectorAll('input').forEach((input) => {
      input.disabled = busy || finished || !minor;
      input.required = minor && input.hasAttribute('data-guardian-required');
    });
    if (minor !== signerIsMinor) { resetSignature(); signerIsMinor = minor; }
    const busEligible = age() !== null && age() >= busMinimumAge;
    const wantsBus = get('busUse').value === 'yes';
    get('busUse').setCustomValidity(wantsBus && age() !== null && !busEligible ? `Für die Busnutzung musst du mindestens ${busMinimumAge} Jahre alt sein. Bitte prüfe dein Geburtsdatum oder wähle „Nein, derzeit nicht“.` : '');
    busApplication.hidden = !wantsBus;
    busApplication.querySelectorAll('input').forEach((input) => {
      const active = wantsBus;
      input.disabled = busy || finished || !active;
      input.required = active && input.hasAttribute('data-bus-required');
    });
    busAgeHint.textContent = age() === null ? `Bei „Ja“ erscheinen direkt darunter die Uploads für beide Führerscheinseiten. Ob du mindestens ${busMinimumAge} Jahre alt bist, prüfen wir anhand deines Geburtsdatums bei den persönlichen Daten.`
      : busEligible ? 'Die Altersvoraussetzung ist erfüllt. Dein Führerscheinnachweis und die Fahrberechtigung werden anschließend im Verein geprüft.'
      : 'Den Bus kannst du ab deinem 26. Geburtstag selbst fahren. Wähle für dein Onboarding zunächst „Nein, derzeit nicht“.';
    form.querySelector('[data-signature-label]').textContent = minor ? 'Unterschrift der sorgeberechtigten Person *' : 'Deine Unterschrift für die Trainerunterlagen *';
    submit.disabled = busy || finished || !captchaReady;
    reload.disabled = busy || finished || loadingCaptcha;
    clearSignature.disabled = busy || finished;
    form.setAttribute('aria-busy', String(busy));
  };
  const validateDate = (name) => {
    const input = get(name);
    const date = parseGermanDate(input.value);
    input.setCustomValidity(!input.value ? '' : !date ? 'Bitte gib ein gültiges Datum im Format TT.MM.JJJJ ein.'
      : date > berlinToday() ? 'Das Datum darf nicht in der Zukunft liegen.'
      : name === 'signingDate' && date < parseGermanDate(get('birthDate').value) ? 'Das Unterschriftsdatum muss nach dem Geburtsdatum liegen.' : '');
  };
  for (const name of ['birthDate','signingDate']) {
    get(name).addEventListener('input', () => { validateDate(name); updateState(); });
    get(name).addEventListener('blur', () => {
      const date = parseGermanDate(get(name).value);
      if (date) get(name).value = formatGermanDate(date);
      validateDate(name); updateState();
    });
  }
  const validateIban = () => get('iban').setCustomValidity(!get('iban').value || isValidIban(get('iban').value) ? '' : 'Bitte gib eine vollständige IBAN mit gültiger Prüfziffer ein.');
  get('iban').addEventListener('input', validateIban);
  get('iban').addEventListener('blur', () => { get('iban').value = normalizeIban(get('iban').value).replace(/(.{4})(?=.)/g, '$1 '); validateIban(); });
  get('bic').addEventListener('blur', () => { get('bic').value = get('bic').value.trim().toUpperCase(); });

  const resetSignature = () => {
    context.clearRect(0,0,canvas.width,canvas.height);
    get('signatureData').value = '';
    signed = false; drawing = false; strokeLength = 0;
  };
  get('membership').addEventListener('change', () => {
    resetSignature();
    get('membershipApplicationAccepted').checked = false;
    status.textContent = '';
    updateState();
  });
  get('busUse').addEventListener('change', () => {
    if (get('busUse').value !== 'yes') {
      busApplication.querySelectorAll('input:not([type="hidden"])').forEach((input) => {
        input.checked = false; input.value = input.type === 'checkbox' ? 'accepted' : ''; input.setCustomValidity('');
      });
    } else {
      form.querySelector('.bus-rules').open = true;
    }
    updateState(); validateFiles();
  });
  clearSignature.addEventListener('click', resetSignature);
  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (busy || finished) return;
    event.preventDefault(); drawing = true; strokeLength = 0;
    canvas.setPointerCapture(event.pointerId);
    previousPoint = point(event);
    context.lineWidth = 2.6; context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#092f20';
    context.beginPath(); context.moveTo(previousPoint.x,previousPoint.y);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    event.preventDefault(); const current = point(event);
    strokeLength += Math.hypot(current.x-previousPoint.x,current.y-previousPoint.y);
    context.lineTo(current.x,current.y); context.stroke(); previousPoint = current;
  });
  const finishStroke = (event) => {
    if (!drawing) return;
    drawing = false;
    try { canvas.releasePointerCapture(event.pointerId); } catch {}
    if (strokeLength > 12) signed = true;
    if (signed) {
      get('signatureData').value = canvas.toDataURL('image/png');
      if (status.textContent === signatureRequiredMessage) status.textContent = '';
    }
  };
  canvas.addEventListener('pointerup',finishStroke);
  canvas.addEventListener('pointercancel',finishStroke);

  const validateFiles = () => {
    let totalSize = 0;
    let firstUpload;
    for (const name of uploadNames) {
      const input = get(name); const file = input.files[0];
      if (input.disabled || input.closest('fieldset').disabled) { input.setCustomValidity(''); continue; }
      if (file) { totalSize += file.size; firstUpload ??= input; }
      input.setCustomValidity(file && (!/\.(pdf|jpe?g|png)$/i.test(file.name) || !file.size || file.size > 3*1024*1024)
        ? 'Bitte lade eine PDF-, JPG- oder PNG-Datei mit höchstens 3 MB hoch.' : '');
    }
    if (totalSize > 10*1024*1024) firstUpload?.setCustomValidity('Alle Ausweis- und Führerscheinkopien zusammen dürfen höchstens 10 MB groß sein. Bitte verkleinere die Dateien.');
  };
  for (const name of uploadNames) get(name).addEventListener('change',validateFiles);
  const requestJson = async (options = {}) => {
    const response = await fetch(form.dataset.endpoint, {...options, credentials:'include', headers:{Accept:'application/json'}, signal:AbortSignal.timeout(options.method === 'POST' ? 180000 : 15000)});
    const result = await response.json();
    if (result.code === 'trainer_access_required') window.dispatchEvent(new Event('bsv:trainer-access-required'));
    return {response,result};
  };
  const loadCaptcha = async () => {
    if (loadingCaptcha || finished) return false;
    loadingCaptcha = true; captchaReady = false; get('captchaAnswer').value = '';
    question.textContent = 'Spamschutz wird geladen …'; updateState();
    try {
      const {response,result} = await requestJson();
      if (!response.ok || !result.ok || result.features?.trainerOnboarding !== true || !Number.isInteger(result.a) || !Number.isInteger(result.b)) throw new Error();
      question.textContent = `Spamschutz: Wie viel ist ${result.a} + ${result.b}? *`;
      captchaReady = true; return true;
    } catch {
      question.textContent = 'Spamschutz nicht verfügbar'; return false;
    } finally { loadingCaptcha = false; updateState(); }
  };
  const retryCaptcha = async () => {
    if (busy || finished || loadingCaptcha) return;
    status.textContent = '';
    if (!await loadCaptcha()) status.textContent = 'Der Formularservice konnte nicht erreicht werden. Deine Eingaben bleiben erhalten. Bitte versuche „Neue Aufgabe“ oder kontaktiere die Jugendleitung.';
  };
  reload.addEventListener('click',retryCaptcha);
  window.addEventListener('bsv:trainer-access-renewed',retryCaptcha);
  form.addEventListener('submit',async (event) => {
    event.preventDefault(); if (busy || finished || !captchaReady) return;
    for (const input of form.querySelectorAll('input:not([type="checkbox"]):not([type="file"]):not([type="hidden"])')) input.value = input.value.trim();
    for (const name of ['birthDate','signingDate']) {
      const date = parseGermanDate(get(name).value); if (date) get(name).value = formatGermanDate(date); validateDate(name);
    }
    get('iban').value = normalizeIban(get('iban').value); get('bic').value = get('bic').value.toUpperCase();
    validateIban(); updateState(); validateFiles();
    if (!form.reportValidity()) return;
    if (!signed || !get('signatureData').value) {
      status.textContent = signatureRequiredMessage; canvas.focus(); return;
    }
    const data = new FormData(form);
    data.set('birthDate',parseGermanDate(get('birthDate').value));
    data.set('signingDate',parseGermanDate(get('signingDate').value));
    const welcomeSelection = {team:get('team').value,bus:get('busUse').value,membership:get('membership').value};
    busy = true; help.hidden = true; updateState(); submitLabel.textContent = 'Unterlagen werden übermittelt …'; status.textContent = 'Deine Unterlagen werden übermittelt …';
    try {
      const {response,result} = await requestJson({method:'POST',body:data});
      if (result.accepted === true && (!response.ok || !result.ok)) {
        finished = true; status.textContent = result.message || 'Ein Teil deiner Unterlagen wurde bereits übermittelt. Bitte sende sie nicht erneut ab und kontaktiere die Jugendleitung.'; help.hidden = false; submitLabel.textContent = 'Rückfrage zur Übermittlung';
      } else if (!response.ok || !result.ok || !result.applicationNumber || !result.delivered) {
        throw new Error(result.message || 'Die Übermittlung konnte nicht bestätigt werden.');
      } else {
        finished = true; form.reset(); resetSignature();
        status.textContent = result.mailMode === 'test' ? 'Testübermittlung erfolgreich. Die Unterlagen wurden im Testbetrieb versendet.'
          : `Deine Unterlagen wurden unter ${result.applicationNumber} übermittelt. Die Jugendleitung begleitet deinen weiteren Start.`;
        if (result.applicantCopySent === false) { status.textContent += '\nDeine E-Mail-Kopie konnte nicht versendet werden. Bitte sende die Unterlagen nicht erneut ab.'; help.hidden = false; }
        submitLabel.textContent = 'Unterlagen übermittelt';
        const thanks = new URL(form.dataset.thankYouUrl,location.href);
        thanks.hash = new URLSearchParams({...welcomeSelection,submitted:'yes',reference:result.applicationNumber,mode:result.mailMode === 'test' ? 'test' : 'live',copy:result.applicantCopySent === false ? 'failed' : 'sent',pending:Array.isArray(result.pendingNotifications) ? result.pendingNotifications.join(',') : ''}).toString();
        location.assign(thanks.href);
      }
    } catch (error) {
      status.textContent = error instanceof Error && !['TimeoutError','TypeError','SyntaxError'].includes(error.name) ? error.message
        : 'Die Übermittlung konnte nicht bestätigt werden. Deine Eingaben bleiben erhalten. Frage bei der Jugendleitung nach, bevor du erneut sendest.';
      help.hidden = false; submitLabel.textContent = 'Unterschriebenes Formular senden';
      if (!await loadCaptcha()) status.textContent += '\nBitte lade den Spamschutz über „Neue Aufgabe“ erneut.';
    } finally { busy = false; updateState(); status.focus(); }
  });
  updateState(); retryCaptcha();
};
