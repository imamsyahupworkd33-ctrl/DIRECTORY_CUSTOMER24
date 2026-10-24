/**
 * Saldo KOIN pelanggan (1 koin = Rp 1). Koin hanya diisi admin (top up lewat admin).
 * Dipakai untuk membayar pesanan BEM / SEM / LEM (langganan baru, perpanjang, bot order).
 * Butuh sql/koin-usdt-1…3 (3 bagian) — bila belum dijalankan, kotak koin tidak tampil dan alur bayar lama dipakai.
 */
Object.assign(TRANSLATIONS.id, {
    coin_title: "Saldo Koin", coin_topup: "Top Up", coin_hist: "Riwayat Koin", coin_hist_empty: "Belum ada riwayat koin.",
    coin_info: "1 koin = Rp 1. Koin dipakai untuk membayar pesanan BEM / SEM / LEM. Isi saldo hanya lewat admin.",
    coin_j_topup: "Top up", coin_j_koreksi: "Koreksi", coin_j_order: "Pesanan", coin_j_refund: "Pengembalian",
    coin_topup_title: "Top Up Koin", coin_topup_sub: "Top up hanya lewat admin: bayar ke salah satu metode di bawah, kirim bukti ke admin, lalu admin akan mengisi koin Anda.",
    coin_amount: "Jumlah koin yang ingin diisi", coin_eq: "= {rp}{usdt}", coin_topup_send: "Kirim bukti ke Admin (WhatsApp)", coin_topup_close: "Tutup",
    coin_topup_none: "Hubungi admin untuk top up koin.",
    coin_topup_wa: "Halo Admin, saya ingin top up {n} koin ({eq}). Akun: {u}. Berikut bukti pembayarannya:"
});
Object.assign(TRANSLATIONS.en, {
    coin_title: "Coin Balance", coin_topup: "Top Up", coin_hist: "Coin History", coin_hist_empty: "No coin history yet.",
    coin_info: "1 coin = Rp 1. Coins pay for BEM / SEM / LEM orders. Balance can only be topped up through the admin.",
    coin_j_topup: "Top up", coin_j_koreksi: "Correction", coin_j_order: "Order", coin_j_refund: "Refund",
    coin_topup_title: "Top Up Coins", coin_topup_sub: "Top up is done through the admin only: pay using one of the methods below, send the proof to the admin, and the admin will credit your coins.",
    coin_amount: "Coins you want to add", coin_eq: "= {rp}{usdt}", coin_topup_send: "Send proof to Admin (WhatsApp)", coin_topup_close: "Close",
    coin_topup_none: "Contact the admin to top up coins.",
    coin_topup_wa: "Hello Admin, I'd like to top up {n} coins ({eq}). Account: {u}. Here is my payment proof:"
});

const coinNum = n => Number(n || 0).toLocaleString(typeof currentLang !== "undefined" && currentLang === "en" ? "en-US" : "id-ID");
let _coinHistOpen = false;

/** Muat saldo. Mengembalikan { koin, riwayat } atau null bila sistem koin belum dipasang. */
async function loadCoin() {
    const { data, error } = await cuRpc("cu_coin_info");
    if (error || !data) { cuCoin = null; renderCoinBox(); return null; }
    cuCoin = data; renderCoinBox();
    return cuCoin;
}

function renderCoinBox() {
    const box = $("coinBox"); if (!box) return;
    if (!cuCoin) { box.innerHTML = ""; return; }
    const hist = (cuCoin.riwayat || []);
    const loc = typeof currentLang !== "undefined" && currentLang === "en" ? "en-US" : "id-ID";
    box.innerHTML = `<div class="panel coin-panel">
        <div class="coin-top">
            <div><div class="coin-label">🪙 ${escapeHtml(t("coin_title"))}</div><div class="coin-amount">${coinNum(cuCoin.koin)}</div><div class="coin-sub">≈ ${escapeHtml(fmtRp(cuCoin.koin))}</div></div>
            <button type="button" class="btn btn-primary" id="coinTopupBtn">➕ ${escapeHtml(t("coin_topup"))}</button>
        </div>
        <div class="coin-note">${escapeHtml(t("coin_info"))}</div>
        <button type="button" class="coin-hist-toggle" id="coinHistBtn">${_coinHistOpen ? "▾" : "▸"} ${escapeHtml(t("coin_hist"))}</button>
        ${_coinHistOpen ? `<div class="coin-hist">${hist.length ? hist.map(h => `<div class="coin-hist-row"><span>${escapeHtml(t("coin_j_" + h.jenis))}${h.keterangan ? " · " + escapeHtml(h.keterangan) : ""}<small>${new Date(h.created_at).toLocaleString(loc, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small></span><b class="${h.delta > 0 ? "plus" : "minus"}">${h.delta > 0 ? "+" : ""}${coinNum(h.delta)}</b></div>`).join("") : `<div class="coin-hist-empty">${escapeHtml(t("coin_hist_empty"))}</div>`}</div>` : ""}
    </div>`;
    $("coinTopupBtn").addEventListener("click", () => openTopupModal());
    $("coinHistBtn").addEventListener("click", () => { _coinHistOpen = !_coinHistOpen; renderCoinBox(); });
}

/** Layar Top Up: metode bayar admin + nominal + kirim bukti via WhatsApp. need = kekurangan koin (opsional). */
async function openTopupModal(need) {
    const { data: p } = await cuRpc("cu_payment_info");
    await ensurePriceInfo();
    const ov = document.createElement("div"); ov.className = "pay-overlay";
    const start = Math.max(1000, Math.ceil((need || 50000) / 1000) * 1000);
    const user = sessionStorage.getItem("admin_view_name") || localStorage.getItem("pelanggan_username") || "";
    ov.innerHTML = `<div class="pay-box" role="dialog" aria-modal="true">
        <div class="modal-title">🪙 ${escapeHtml(t("coin_topup_title"))}</div>
        <div class="modal-sub">${escapeHtml(t("coin_topup_sub"))}</div>
        <div class="field"><label class="rn-label" for="coinAmt">${escapeHtml(t("coin_amount"))}</label>
            <input type="number" id="coinAmt" min="1000" step="1000" inputmode="numeric" value="${start}">
            <div class="coin-chips">${[10000, 25000, 50000, 100000, 250000].map(n => `<button type="button" class="rn-chip" data-n="${n}">${coinNum(n)}</button>`).join("")}</div>
            <div class="rn-hint" id="coinEq"></div></div>
        ${p && p.configured ? payMethodsHtml(p) : `<div class="pay-warn">${escapeHtml(t("coin_topup_none"))}</div>`}
        <a class="btn btn-wa btn-block" id="coinWa" href="#" target="_blank" rel="noopener" style="margin-top:10px;">💬 ${escapeHtml(t("coin_topup_send"))}</a>
        <button type="button" class="btn btn-ghost btn-block" id="coinTopClose" style="margin-top:8px;">${escapeHtml(t("coin_topup_close"))}</button></div>`;
    document.body.appendChild(ov);
    payBindCopy(ov);
    const upd = () => {
        const n = parseInt(ov.querySelector("#coinAmt").value, 10) || 0, u = "";
        const eq = t("coin_eq", { rp: fmtRp(n), usdt: u ? " ≈ " + u : "" });
        ov.querySelector("#coinEq").textContent = eq;
        ov.querySelector("#coinWa").href = waUrl(t("coin_topup_wa", { n: coinNum(n), eq: fmtRp(n) + (u ? " ≈ " + u : ""), u: user }));
    };
    ov.querySelector("#coinAmt").addEventListener("input", upd);
    ov.querySelector(".coin-chips").addEventListener("click", e => { const c = e.target.closest("[data-n]"); if (c) { ov.querySelector("#coinAmt").value = c.dataset.n; upd(); } });
    ov.querySelector("#coinTopClose").addEventListener("click", () => ov.remove());
    upd();
}

document.addEventListener("DOMContentLoaded", () => { loadCoin(); setInterval(() => { if (!document.hidden) loadCoin(); }, 60000); });
document.addEventListener("langchange", renderCoinBox);
