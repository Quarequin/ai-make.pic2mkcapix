!function() {
	const e = e => document.getElementById(e), o = e("notification-popup-overlay");
	function n(n, t, r) {
		e("popup-err-type").textContent = n || "Runtime Error", e("popup-err-message").textContent = t || "Unknown error.", 
		e("popup-err-stack").value = r || "No call stack trace records.", e("popup-err-stack").style.display = "none", 
		e("btn-toggle-log").textContent = "Show Full Log ▼", o && (o.style.display = "block");
	}
	function t() {
		const o = e("popup-err-stack"), n = "none" === o.style.display || !o.style.display;
		o.style.display = n ? "block" : "none", e("btn-toggle-log").textContent = n ? "Hide Full Log ▲" : "Show Full Log ▼";
	}
	function r() {
		o && (o.style.display = "none");
	}
	window.displayErrorPopup = n, window.toggleErrorLog = t, window.closeErrorPopup = r, 
	e("popup-close-btn")?.addEventListener("click", r), e("btn-toggle-log")?.addEventListener("click", t), 
	window.addEventListener("error", e => n("Uncaught Runtime Exception", e.message, e.error?.stack)), 
	window.addEventListener("unhandledrejection", e => {
		const o = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
		n("Unhandled Promise Rejection", o.message, o.stack);
	});
}();