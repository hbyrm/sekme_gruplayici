document.addEventListener('DOMContentLoaded', function () {
  const sekmeListesiDiv = document.getElementById('sekmeListesi');
  const grupListesiDiv = document.getElementById('grupListesi');
  const grupAdiInput = document.getElementById('grupAdi');
  const btnKaydet = document.getElementById('btnKaydet');
  const btnHepsiniSec = document.getElementById('btnHepsiniSec');
  const btnSecimiKaldir = document.getElementById('btnSecimiKaldir');
  const btnIndir = document.getElementById('btnIndir');

  let acikSekmeler = [];

  // 1. Mevcut açık sekmeleri çek ve listele
  chrome.tabs.query({}, function (tabs) {
    acikSekmeler = tabs;
    tablariListele();
  });

  function tablariListele() {
    sekmeListesiDiv.innerHTML = '';
    acikSekmeler.forEach((tab, index) => {
      const item = document.createElement('div');
      item.className = 'sekme-item';
      item.innerHTML = `
        <input type="checkbox" id="tab-${index}" value="${index}" checked>
        <span title="${tab.title}\n${tab.url}">${tab.title}</span>
      `;
      sekmeListesiDiv.appendChild(item);
    });
  }

  // Hepsini seç / Seçimi kaldır butonları
  btnHepsiniSec.addEventListener('click', () => ayarlariDegistir(true));
  btnSecimiKaldir.addEventListener('click', () => ayarlariDegistir(false));

  function ayarlariDegistir(durum) {
    const checkboxes = sekmeListesiDiv.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = durum);
  }

  // 2. Seçilen sekmeleri gruba kaydetme
  btnKaydet.addEventListener('click', function () {
    const grupName = grupAdiInput.value.trim();
    if (!grupName) {
      alert('Lütfen bir grup adı girin!');
      return;
    }

    const checkboxes = sekmeListesiDiv.querySelectorAll('input[type="checkbox"]:checked');
    const secilenLinkler = [];

    checkboxes.forEach(cb => {
      const idx = parseInt(cb.value);
      secilenLinkler.push({
        title: acikSekmeler[idx].title,
        url: acikSekmeler[idx].url
      });
    });

    if (secilenLinkler.length === 0) {
      alert('Lütfen kaydetmek için en az bir sekme seçin.');
      return;
    }

    // Mevcut grupları yükle ve üzerine ekle
    chrome.storage.sync.get({ linkGruplari: {} }, function (data) {
      const gruplar = data.linkGruplari;
      gruplar[grupName] = secilenLinkler; // Aynı isimde grup varsa üstüne yazar

      chrome.storage.sync.set({ linkGruplari: gruplar }, function () {
        grupAdiInput.value = '';
        gruplariListele();
        alert(`"${grupName}" grubu başarıyla kaydedildi!`);
      });
    });
  });

  // 3. Kaydedilen grupları ekranda gösterme
  function gruplariListele() {
    chrome.storage.sync.get({ linkGruplari: {} }, function (data) {
      grupListesiDiv.innerHTML = '';
      const gruplar = data.linkGruplari;

      for (const [grupAdi, linkler] of Object.entries(gruplar)) {
        const grupBox = document.createElement('div');
        grupBox.className = 'grup-kapsayici';

        // Grup Başlığı ve Sil Butonu
        const header = document.createElement('div');
        header.className = 'grup-header';
        header.innerHTML = `
          <span>${grupAdi} (${linkler.length} Link)</span>
          <button class="btn-sil" data-grup="${grupAdi}">Grubu Sil</button>
        `;
        grupBox.appendChild(header);

        // Grup İçindeki Linkler
        const linklerDiv = document.createElement('div');
        linklerDiv.className = 'grup-linkler';
        linkler.forEach(link => {
          const lItem = document.createElement('div');
          lItem.style.margin = '3px 0';
          lItem.innerHTML = `<span class="grup-ac-link" data-url="${link.url}" title="${link.url}">${link.title}</span>`;
          linklerDiv.appendChild(lItem);
        });
        grupBox.appendChild(linklerDiv);
        grupListesiDiv.appendChild(grupBox);
      }

      // Dinamik oluşan "Grubu Sil" butonlarına görev tanımlama
      document.querySelectorAll('.btn-sil').forEach(btn => {
        btn.addEventListener('click', function () {
          const silinecekGrup = this.getAttribute('data-grup');
          if (confirm(`"${silinecekGrup}" grubunu silmek istediğinize emin misiniz?`)) {
            grupSil(silinecekGrup);
          }
        });
      });

      // Dinamik oluşan linklere tıklama özelliği (Yeni sekmede açar)
      document.querySelectorAll('.grup-ac-link').forEach(linkSpan => {
        linkSpan.addEventListener('click', function () {
          const url = this.getAttribute('data-url');
          chrome.tabs.create({ url: url });
        });
      });
    });
  }

  // Grup Silme Fonksiyonu
  function grupSil(grupName) {
    chrome.storage.sync.get({ linkGruplari: {} }, function (data) {
      const gruplar = data.linkGruplari;
      delete gruplar[grupName];
      chrome.storage.sync.set({ linkGruplari: gruplar }, function () {
        gruplariListele();
      });
    });
  }

  // 4. Verileri bilgisayara indirilebilir dosya (JSON) yapma
  btnIndir.addEventListener('click', function () {
    chrome.storage.sync.get({ linkGruplari: {} }, function (data) {
      if (Object.keys(data.linkGruplari).length === 0) {
        alert('İndirilecek kayıtlı grup bulunamadı.');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data.linkGruplari, null, 2));
      const indirmeLinki = document.createElement('a');
      indirmeLinki.setAttribute("href", dataStr);
      indirmeLinki.setAttribute("download", "sekme_gruplarim_yedek.json");
      document.body.appendChild(indirmeLinki);
      indirmeLinki.click();
      indirmeLinki.remove();
    });
  });

  // İlk açılışta kayıtlı grupları getir
  gruplariListele();
});