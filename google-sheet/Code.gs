// ===== BACKEND WEB ULANG TAHUN (Google Sheet + Drive) =====
// Tempel seluruh kode ini di Extensions > Apps Script pada Google Sheet Anda.

// >>> WAJIB GANTI sandi ini, lalu Deploy. Sandi dipakai untuk masuk ke admin.html <<<
const SANDI_ADMIN = "1111";

const VERSI = "2026.10.18-bersih";
const NAMA_SHEET = "Ucapan", SHEET_SET = "Pengaturan", NAMA_FOLDER = "Foto Ucapan Ulang Tahun";

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sh_() {
  let sh = ss_().getSheetByName(NAMA_SHEET);
  if (!sh) {
    sh = ss_().insertSheet(NAMA_SHEET);
    sh.appendRow(["Waktu", "Nama", "Hubungan", "Ucapan", "Foto", "Tampil", "ID", "Suara"]);
    sh.getRange("B:E").setNumberFormat("@");
    sh.setFrozenRows(1);
  }
  if (sh.getRange(1, 7).getValue() !== "ID") sh.getRange(1, 7).setValue("ID");
  if (sh.getRange(1, 8).getValue() !== "Suara") sh.getRange(1, 8).setValue("Suara");
  return sh;
}
function folder_() {
  const it = DriveApp.getFoldersByName(NAMA_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(NAMA_FOLDER);
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clean_(v, n) { return String(v || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n); }
// ---- pengaturan (disimpan di tab "Pengaturan") ----
function getSet_() {
  const sh = ss_().getSheetByName(SHEET_SET);
  if (!sh) return {};
  try { return JSON.parse(sh.getRange("A2").getValue() || "{}"); } catch (e) { return {}; }
}
function putSet_(o) {
  let sh = ss_().getSheetByName(SHEET_SET);
  if (!sh) { sh = ss_().insertSheet(SHEET_SET); sh.getRange("A1").setValue("Pengaturan (diatur lewat admin.html, jangan diubah manual)"); sh.getRange("A2").setNumberFormat("@"); }
  sh.getRange("A2").setValue(JSON.stringify(o));
}
function bersih_(p) {
  p = p || {};
  const s = (v, n) => String(v == null ? "" : v).slice(0, n), b = v => !!v;
  const nums = a => (Array.isArray(a) ? a : []).map(Number).filter(n => n >= 1 && n <= 9).slice(0, 9);
  return {
    nama: s(p.nama, 60), umur: s(p.umur, 3), dari: s(p.dari, 60),
    ucapan: (Array.isArray(p.ucapan) ? p.ucapan : []).map(x => s(x, 300).trim()).filter(Boolean).slice(0, 30),
    teksMelingkar: s(p.teksMelingkar, 80), teksBerjalan: s(p.teksBerjalan, 300),
    tema: s(p.tema, 40), tombolTema: b(p.tombolTema),
    lingkaranFoto: b(p.lingkaranFoto), posisiFoto: p.posisiFoto === "kiri" ? "kiri" : "kanan",
    latar: ["video", "foto", "polos"].indexOf(p.latar) >= 0 ? p.latar : "foto",
    foto: nums(p.foto), video: Math.max(0, Math.min(9, +p.video || 0)), videoSuara: b(p.videoSuara), lagu: nums(p.lagu),
    konfeti: ["meriah", "ringan", "mati"].indexOf(p.konfeti) >= 0 ? p.konfeti : "meriah", ornamen: b(p.ornamen),
    teksTeman: b(p.teksTeman), slideTeman: b(p.slideTeman), fotoTeman: b(p.fotoTeman),
    moderasi: b(p.moderasi), izinFoto: b(p.izinFoto), segarkan: Math.max(15, Math.min(600, +p.segarkan || 60))
  };
}

function items_() {
  const rows = sh_().getDataRange().getValues().slice(1);
  return rows.filter(r => String(r[5]).toUpperCase() === "YA" && r[3])
    .map(r => ({ nama: r[1], hubungan: r[2], pesan: r[3], foto: r[4] || "", suara: r[7] || "" })).slice(-200);
}

// Ambil file audio dari folder ucapan dan kirim sebagai base64 (JSON).
// Cara ini menghindari pemblokiran hotlink Google Drive, sehingga suara pasti bisa diputar.
function audio_(id) {
  id = String(id || "").trim();
  if (!/^[\w-]{10,}$/.test(id)) return { ok: false, error: "ID tidak valid" };
  const f = DriveApp.getFileById(id);
  const folderId = folder_().getId(), ps = f.getParents();
  let boleh = false;
  while (ps.hasNext()) { if (ps.next().getId() === folderId) { boleh = true; break; } }
  if (!boleh) return { ok: false, error: "Tidak diizinkan" };
  const blob = f.getBlob(), mime = String(blob.getContentType() || "");
  if (mime.indexOf("audio/") !== 0 && mime.indexOf("video/webm") !== 0) return { ok: false, error: "Bukan file audio" };
  const bytes = blob.getBytes();
  if (bytes.length > 8000000) return { ok: false, error: "File terlalu besar" };
  return { ok: true, mime: mime, data: Utilities.base64Encode(bytes) };
}


function setup() { sh_(); folder_(); if (!ss_().getSheetByName(SHEET_SET)) putSet_({}); }

// ---- baca (publik) ----
function doGet(e) {
  try {
    const a = (e && e.parameter && e.parameter.action) || "";
    if (a === "init") return out_({ ok: true, pengaturan: getSet_(), items: items_() });
    if (a === "list") return out_({ ok: true, items: items_() });
    if (a === "audio") return out_(audio_(e.parameter.id));
    if (a === "versi") return out_({ ok: true, versi: VERSI });
    return out_({ ok: true, info: "aktif", versi: VERSI });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

// ---- tulis ----
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const d = JSON.parse(e.postData.contents), aksi = d.aksi || "kirim";

    if (aksi === "kirim") {
      const set = getSet_();
      const nama = clean_(d.nama, 40), hub = clean_(d.hubungan, 30), pesan = clean_(d.pesan, 500);
      if (!nama || !pesan) return out_({ ok: false, error: "Nama dan ucapan wajib diisi" });
      let foto = "";
      if (d.foto && set.izinFoto !== false) {
        if (d.foto.length > 2500000) return out_({ ok: false, error: "Foto terlalu besar" });
        const blob = Utilities.newBlob(Utilities.base64Decode(d.foto), "image/jpeg", "ucapan_" + Date.now() + ".jpg");
        const f = folder_().createFile(blob);
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        foto = "https://drive.google.com/thumbnail?id=" + f.getId() + "&sz=w1000";
      }
      let suara = "";
      if (d.suara) {
        if (d.suara.length > 4000000) return out_({ ok: false, error: "Rekaman terlalu besar. Maksimal sekitar 45 detik; coba rekam lebih singkat." });
        const tipe = String(d.suaraTipe || "audio/webm").slice(0, 80);
        if (tipe.indexOf("audio/") !== 0 && tipe.indexOf("video/webm") !== 0) return out_({ ok: false, error: "File suara tidak valid" });
        const ext = tipe.indexOf("mp4") >= 0 ? "m4a" : tipe.indexOf("mpeg") >= 0 || tipe.indexOf("mp3") >= 0 ? "mp3" : tipe.indexOf("wav") >= 0 ? "wav" : tipe.indexOf("ogg") >= 0 ? "ogg" : tipe.indexOf("aac") >= 0 ? "aac" : "webm";
        const blob = Utilities.newBlob(Utilities.base64Decode(d.suara), tipe, "suara_ucapan_" + Date.now() + "." + ext);
        const f = folder_().createFile(blob);
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        suara = "https://drive.google.com/uc?export=download&id=" + f.getId();
      }
      sh_().appendRow([new Date(), nama, hub, pesan, foto, set.moderasi ? "" : "YA", Utilities.getUuid().slice(0, 8), suara]);
      return out_({ ok: true, moderasi: !!set.moderasi });
    }

    // ===== aksi admin (butuh sandi) =====
    if (SANDI_ADMIN === "GANTI-SANDI-INI") return out_({ ok: false, error: "Ganti dulu SANDI_ADMIN di Code.gs lalu Deploy ulang" });
    if (String(d.sandi || "") !== SANDI_ADMIN) { Utilities.sleep(800); return out_({ ok: false, error: "Sandi salah" }); }

    if (aksi === "masuk") return out_({ ok: true, pengaturan: getSet_() });
    if (aksi === "simpan") { putSet_(bersih_(d.pengaturan)); return out_({ ok: true }); }

    if (aksi === "daftar") {
      const sh = sh_(), rows = sh.getDataRange().getValues();
      const list = [];
      for (let i = 1; i < rows.length; i++) {
        let id = String(rows[i][6] || "");
        if (!id) { id = Utilities.getUuid().slice(0, 8); sh.getRange(i + 1, 7).setValue(id); }
        list.push({ id: id, waktu: String(rows[i][0]), nama: rows[i][1], hubungan: rows[i][2], pesan: rows[i][3], foto: rows[i][4] || "", suara: rows[i][7] || "", tampil: String(rows[i][5]).toUpperCase() === "YA" });
      }
      return out_({ ok: true, items: list.reverse().slice(0, 300) });
    }
    if (aksi === "ubah") {
      const sh = sh_(), ids = sh.getRange(1, 7, sh.getLastRow(), 1).getValues();
      for (let i = 1; i < ids.length; i++) {
        if (String(ids[i][0]) === String(d.id)) {
          if (d.tampil === "HAPUS") sh.deleteRow(i + 1);
          else sh.getRange(i + 1, 6).setValue(d.tampil === "YA" ? "YA" : "TIDAK");
          return out_({ ok: true });
        }
      }
      return out_({ ok: false, error: "Ucapan tidak ditemukan" });
    }
    return out_({ ok: false, error: "Aksi tidak dikenal" });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}
