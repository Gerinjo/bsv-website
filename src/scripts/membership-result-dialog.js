import { membershipResultText } from '../utils/membership-result.mjs';

export function createMembershipResultDialog() {
  const dialog = document.querySelector('#membership-result-dialog');
  const receipt = document.querySelector('#membership-result');
  const countdown = dialog.querySelector('[data-result-countdown]');
  const seconds = dialog.querySelector('[data-result-seconds]');
  const keepOpen = dialog.querySelector('[data-result-keep-open]');
  let interval;
  let lastResult;
  let previousOverflow;
  let previousFocus;

  const stopCountdown = () => {
    clearInterval(interval);
    interval = undefined;
    countdown.hidden = true;
    keepOpen.hidden = true;
  };
  dialog.querySelectorAll('[data-result-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  keepOpen.addEventListener('click', () => {
    stopCountdown();
    dialog.querySelector('.dialog-done').focus({ preventScroll: true });
  });
  dialog.addEventListener('close', () => {
    stopCountdown();
    document.body.style.overflow = previousOverflow;
    if (lastResult?.delivered) {
      receipt.focus({ preventScroll: true });
      receipt.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else {
      const target = previousFocus?.disabled ? document.querySelector('#form-status') : previousFocus;
      target?.focus({ preventScroll: true });
    }
  });

  const show = (result, autoClose = result.kind === 'success') => {
    stopCountdown();
    lastResult = result;
    receipt.hidden = false;
    receipt.dataset.kind = result.kind;
    receipt.querySelector('h2').textContent = result.title;
    receipt.querySelector('[data-result-summary]').textContent = membershipResultText(result);
    receipt.querySelector('[data-result-reopen]').textContent = result.delivered ? 'Bestätigung noch einmal ansehen ↗' : 'Hinweis noch einmal ansehen ↗';
    dialog.dataset.kind = result.kind;
    dialog.querySelector('[data-result-symbol]').textContent = result.kind === 'success' ? '✓' : '!';
    dialog.querySelector('#membership-dialog-title').textContent = result.title;
    dialog.querySelector('[data-result-next-step]').hidden = result.kind !== 'success';
    dialog.querySelector('#membership-dialog-intro').textContent = result.intro;
    const applications = dialog.querySelector('[data-result-applications]');
    applications.replaceChildren();
    for (const item of result.applications) {
      const li = document.createElement('li');
      for (const [tag, value] of [['strong', item.label], ['span', item.person], ['small', item.detail], ['small', item.status]]) {
        const node = document.createElement(tag);
        node.textContent = value;
        li.append(node);
      }
      applications.append(li);
    }
    dialog.querySelector('[data-result-email-title]').textContent = result.emailTitle;
    dialog.querySelector('[data-result-email-text]').textContent = result.emailText;
    const notes = dialog.querySelector('[data-result-notes]');
    notes.replaceChildren();
    notes.hidden = !result.notes.length;
    for (const note of result.notes) {
      const li = document.createElement('li');
      li.textContent = note;
      notes.append(li);
    }
    if (!dialog.open) {
      previousFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
    }
    dialog.scrollTop = 0;
    dialog.querySelector('#membership-dialog-title').focus({ preventScroll: true });
    if (autoClose) {
      const deadline = Date.now() + 5000;
      seconds.textContent = '5';
      countdown.hidden = false;
      keepOpen.hidden = false;
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        seconds.textContent = String(remaining);
        if (remaining === 0) dialog.close();
      }, 100);
    }
  };
  receipt.querySelector('[data-result-reopen]').addEventListener('click', () => show(lastResult, false));
  return { show };
}
