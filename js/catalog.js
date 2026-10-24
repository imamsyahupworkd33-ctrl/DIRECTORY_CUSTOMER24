/**
 * KATALOG (pelanggan): Koin / Voucher / Farm dengan status Ready / Tidak Ready (tanpa stok).
 * Butuh sql/katalog-pesan-baru.sql. Gambar dimuat per item dan di-cache.
 */
Object.assign(TRANSLATIONS.id, {
    cat_tab_stock: "Stok", cat_tab_catalog: "Katalog", cat_title: "Katalog", cat_koin: "Koin", cat_voucher: "Voucher", cat_farm: "Farm",
    cat_ready: "Ready", cat_not_ready: "Tidak Ready", cat_empty: "Belum ada item di kategori ini.", cat_order: "Pesan via WhatsApp",
    cat_wa_text: "Halo admin, saya {u} ingin memesan: {item} ({kat})."
});
Object.assign(TRANSLATIONS.en, {
    cat_tab_stock: "Stock", cat_tab_catalog: "Catalog", cat_title: "Catalog", cat_koin: "Coins", cat_voucher: "Vouchers", cat_farm: "Farm",
    cat_ready: "Ready", cat_not_ready: "Not Ready", cat_empty: "No items in this category yet.", cat_order: "Order via WhatsApp",
    cat_wa_text: "Hello admin, I'm {u} and I'd like to order: {item} ({kat})."
});

let myCatalog = [], myCatCats = [], catKat = "koin";
const CAT_DEFAULT = [{ slug: "koin", nama: "Koin", ikon: "🪙" }, { slug: "voucher", nama: "Voucher", ikon: "🎟" }, { slug: "farm", nama: "Farm", ikon: "🌱" }];
const _catImg = {};   // "id:versi" -> dataURL
const catKey = c => c.id + ":" + c.img_v;

async function loadCatalog() {
    const [a, b] = await Promise.all([cuRpc("cu_catalog"), cuRpc("cu_catalog_cats")]);
    myCatalog = a.data || [];
    myCatCats = (!b.error && b.data && b.data.length) ? b.data : CAT_DEFAULT;   // SQL kategori belum dijalankan -> 3 kategori bawaan
    if (!myCatCats.some(c => c.slug === catKat)) catKat = myCatCats[0].slug;
    renderCatalog();
}

function renderCatalog() {
    const box = $("catList"); if (!box) return;
    $("catTabs").innerHTML = myCatCats.map(c => `<button type="button" class="${c.slug === catKat ? "on" : ""}" data-kat="${escapeHtml(c.slug)}">${escapeHtml(c.ikon)} ${escapeHtml(c.nama)} <i>${myCatalog.filter(x => x.kategori === c.slug).length}</i></button>`).join("");
    const list = myCatalog.filter(c => c.kategori === catKat);
    $("catEmpty").style.display = list.length ? "none" : "block";
    const user = sessionStorage.getItem("admin_view_name") || localStorage.getItem("pelanggan_username") || "";
    box.innerHTML = list.map(c => {
        const src = c.img_v && _catImg[catKey(c)];
        const kn = (myCatCats.find(x => x.slug === c.kategori) || { nama: c.kategori }).nama;
        const msg = t("cat_wa_text", { u: user, item: c.nama, kat: kn }) + (c.harga ? " " + c.harga : "");
        return `<article class="shop-card ${c.ready ? "" : "is-off"}">
            <div class="shop-media" data-cid="${c.id}" ${c.img_v ? `onclick="openCatImg(${c.id})"` : ""}>
                ${src ? `<img src="${src}" alt="${escapeHtml(c.nama)}">` : `<div class="shop-ph">${c.img_v ? "⏳" : "🛍"}</div>`}
                <span class="cat-state ${c.ready ? "ok" : "off"}">${c.ready ? "● " + escapeHtml(t("cat_ready")) : "○ " + escapeHtml(t("cat_not_ready"))}</span>
            </div>
            <div class="shop-body">
                <div class="supply-name">${escapeHtml(c.nama)}</div>
                ${c.harga ? `<div class="cat-price">${escapeHtml(c.harga)}</div>` : ""}
                ${c.deskripsi ? `<div class="supply-meta">${linkify(c.deskripsi)}</div>` : ""}
                ${c.ready ? contactButtonsHtml(msg, "cat-order") : ""}
            </div>
        </article>`;
    }).join("");
    hydrateCatImages();
}

function hydrateCatImages() {
    myCatalog.filter(c => c.img_v && !_catImg[catKey(c)]).forEach(async c => {
        const { data } = await cuRpc("cu_catalog_image", { p_id: c.id });
        if (!data) return;
        _catImg[catKey(c)] = `data:${data.mime};base64,${data.data}`;
        const el = document.querySelector(`#catList .shop-media[data-cid="${c.id}"]`);
        const ph = el && el.querySelector(".shop-ph");
        if (ph) ph.outerHTML = `<img src="${_catImg[catKey(c)]}" alt="${escapeHtml(c.nama)}">`;
    });
}

function openCatImg(id) {
    const c = myCatalog.find(x => x.id === id), src = c && _catImg[catKey(c)]; if (!src) return;
    $("modalBox").innerHTML = `<img src="${src}" alt="" class="shop-zoom"><div class="modal-title" style="margin-top:12px;">${escapeHtml(c.nama)}</div>
        ${c.harga ? `<div class="modal-sub">${escapeHtml(c.harga)}</div>` : ""}
        <button type="button" class="btn btn-ghost btn-block" id="zoomClose">${escapeHtml(t("modal_close"))}</button>`;
    $("modalOverlay").classList.add("show"); $("zoomClose").addEventListener("click", closeModal);
}

document.addEventListener("DOMContentLoaded", () => {
    $("supplySubTabs").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-sub]"); if (!b) return;
        document.querySelectorAll("#supplySubTabs button").forEach(x => x.classList.toggle("on", x === b));
        $("supStokWrap").style.display = b.dataset.sub === "stok" ? "block" : "none";
        $("supKatalogWrap").style.display = b.dataset.sub === "katalog" ? "block" : "none";
    });
    $("catTabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-kat]"); if (b) { catKat = b.dataset.kat; renderCatalog(); } });
    document.addEventListener("langchange", renderCatalog);
    loadCatalog();
});
