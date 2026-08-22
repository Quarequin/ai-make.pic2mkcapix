// mainerr.js — runtime error reporting without dynamic HTML injection.
(function () {
	const byId = (id) => document.getElementById(id);
	const overlay = byId('notification-popup-overlay');

	function displayErrorPopup(type, message, stack) {
		byId('popup-err-type').textContent = type || 'Runtime Error';
		byId('popup-err-message').textContent = message || 'Unknown error.';
		byId('popup-err-stack').value = stack || 'No call stack trace records.';
		byId('popup-err-stack').style.display = 'none';
		byId('btn-toggle-log').textContent = 'Show Full Log ▼';
		if (overlay) overlay.style.display = 'block';
	}

	function toggleErrorLog() {
		const log = byId('popup-err-stack');
		const hidden = log.style.display === 'none' || !log.style.display;
		log.style.display = hidden ? 'block' : 'none';
		byId('btn-toggle-log').textContent = hidden ? 'Hide Full Log ▲' : 'Show Full Log ▼';
	}

	function closeErrorPopup() {
		if (overlay) overlay.style.display = 'none';
	}

	window.displayErrorPopup = displayErrorPopup;
	window.toggleErrorLog = toggleErrorLog;
	window.closeErrorPopup = closeErrorPopup;
	byId('popup-close-btn')?.addEventListener('click', closeErrorPopup);
	byId('btn-toggle-log')?.addEventListener('click', toggleErrorLog);
	window.addEventListener('error', (event) => displayErrorPopup('Uncaught Runtime Exception', event.message, event.error?.stack));
	window.addEventListener('unhandledrejection', (event) => {
		const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
		displayErrorPopup('Unhandled Promise Rejection', reason.message, reason.stack);
	});
})();
