export const initTrainerOnboardingAccess = (gate, onGranted) => {
  const form = gate.querySelector('form');
  const inputs = [...form.querySelectorAll('input')];
  const status = gate.querySelector('[role="status"]');
  const retry = gate.querySelector('button');
  const endpoint = new URL(gate.dataset.endpoint, location.href);
  endpoint.searchParams.set('action', 'access');
  let nonce = '';
  let busy = false;
  let opened = false;
  let retryTimer;

  const request = async (options = {}) => {
    const response = await fetch(endpoint, { ...options, credentials:'include',
      headers:{Accept:'application/json'}, signal:AbortSignal.timeout(15000) });
    return { response, result:await response.json() };
  };
  const open = () => {
    opened = true;
    clearTimeout(retryTimer);
    gate.hidden = true;
    onGranted();
  };
  const showConnectionError = () => {
    status.textContent = 'Die Verbindung konnte nicht hergestellt werden. Bitte versuche es erneut.';
    retry.hidden = false;
  };
  const focus = (index) => { inputs[index].focus({preventScroll:true}); inputs[index].select(); };
  const checkAccess = async () => {
    const {response, result} = await request();
    if (!response.ok || !result.ok) throw new Error();
    if (result.granted === true) { open(); return true; }
    if (typeof result.nonce !== 'string') throw new Error();
    nonce = result.nonce;
    return false;
  };
  const verify = async () => {
    if (busy || opened || !inputs.every(input => /^[a-z]$/i.test(input.value))) return;
    busy = true;
    retry.hidden = true;
    status.textContent = '';
    inputs.forEach(input => { input.disabled = true; input.removeAttribute('aria-invalid'); });
    try {
      if (!nonce && await checkAccess()) return;
      const word = `F${inputs[0].value}s${inputs[1].value}b${inputs[2].value}l${inputs[3].value}`;
      const {response, result} = await request({method:'POST',body:new URLSearchParams({nonce,word})});
      if (response.ok && result.ok && result.granted === true) { open(); return; }
      if (typeof result.nonce === 'string') nonce = result.nonce;
      status.textContent = result.message || 'Bitte prüfe die Buchstaben und versuche es erneut.';
      if (result.code === 'access_word' && Array.isArray(result.invalidFields)) {
        const invalid = result.invalidFields.filter(index => Number.isInteger(index) && index >= 0 && index < inputs.length);
        invalid.forEach(index => inputs[index].setAttribute('aria-invalid','true'));
        inputs.forEach(input => { input.disabled = false; });
        if (invalid.length) focus(invalid[0]);
      } else {
        retry.hidden = false;
        if (result.code === 'access_wait') {
          retry.disabled = true;
          retryTimer = setTimeout(() => { retry.disabled = false; }, Math.min(Math.max(result.retryAfter || 60,1),60)*1000);
        }
      }
    } catch {
      showConnectionError();
    } finally {
      busy = false;
      if (!opened) inputs.forEach(input => { input.disabled = false; });
    }
  };

  const advance = (index) => {
    if (inputs.every(input => /^[a-z]$/i.test(input.value))) { verify(); return; }
    const next = inputs.findIndex((input,position) => position > index && !input.value);
    if (next >= 0) focus(next);
  };
  inputs.forEach((input,index) => {
    input.addEventListener('input', (event) => {
      if (event.isComposing) return;
      input.value = input.value.replace(/[^a-z]/gi,'').slice(-1).toLowerCase();
      input.removeAttribute('aria-invalid');
      status.textContent = '';
      if (input.value) advance(index);
    });
    input.addEventListener('compositionend', () => input.dispatchEvent(new Event('input')));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && index > 0) { event.preventDefault(); inputs[index-1].value = ''; focus(index-1); }
      if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); focus(index-1); }
      if (event.key === 'ArrowRight' && index < inputs.length-1) { event.preventDefault(); focus(index+1); }
    });
    input.addEventListener('paste', (event) => {
      const pasted = event.clipboardData?.getData('text').trim();
      if (!pasted || !/^[a-z]+$/i.test(pasted)) return;
      event.preventDefault();
      const letters = pasted.length === 8 ? [1,3,5,7].map(position => pasted[position]) : [...pasted];
      const start = pasted.length === 8 || letters.length === 4 ? 0 : index;
      letters.slice(0,inputs.length-start).forEach((letter,offset) => {
        inputs[start+offset].value = letter.toLowerCase(); inputs[start+offset].removeAttribute('aria-invalid');
      });
      advance(start+Math.min(letters.length,inputs.length-start)-1);
    });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (inputs.every(input => input.value)) verify();
    else {
      status.textContent = ''; retry.hidden = true;
      checkAccess().then(granted => { if (!granted) focus(Math.max(inputs.findIndex(input => !input.value),0)); }).catch(showConnectionError);
    }
  });
  // A session can expire while a trainer is filling the form. Keep those entries.
  window.addEventListener('bsv:trainer-access-required', () => {
    opened = false; nonce = ''; gate.hidden = false;
    inputs.forEach(input => { input.value = ''; input.disabled = false; });
    status.textContent = 'Bitte ergänze das Wort erneut. Deine Formulareingaben bleiben erhalten.';
    focus(0);
  });
  focus(0);
  checkAccess().catch(showConnectionError);
};
