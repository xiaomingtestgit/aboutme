// 平滑捲動（修正固定導覽高度偏移）
document.querySelectorAll('.menu a, .back-top').forEach(a => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (!target) return;
    const header = document.querySelector('.site-header');
    const top = target.getBoundingClientRect().top + window.pageYOffset - (header?.offsetHeight || 0) - 6;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// 進場淡入（IntersectionObserver）
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // 技能條動畫：第一次可見時推進度
      if (entry.target.id === 'skills') {
        entry.target.querySelectorAll('.bar span').forEach((el) => {
          const w = el.style.width || '0%';
          // 觸發重繪
          el.style.width = '0%';
          setTimeout(() => { el.style.width = w; }, 50);
        });
      }
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.fadein').forEach(el => io.observe(el));

/* 作品圖片庫（LocalStorage） */
const STORAGE_KEY = 'portfolio_images_v2';
function getSaved() {
  const raw = localStorage.getItem(STORAGE_KEY);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function save(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// 生成縮圖（最大邊 900px）
async function createThumbnail(file, maxSide = 900) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.86);
  });
}

// DOM
const fileInput = document.getElementById('file-input');
const galleryEl = document.getElementById('gallery');
const dropzone = document.getElementById('dropzone');
const clearBtn = document.getElementById('clear-gallery');

// 狀態
let items = getSaved(); // { id, dataUrl, name }
render();

fileInput?.addEventListener('change', async (e) => {
  await handleFiles(e.target.files);
  fileInput.value = '';
});

dropzone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('active');
});
dropzone?.addEventListener('dragleave', () => {
  dropzone.classList.remove('active');
});
dropzone?.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropzone.classList.remove('active');
  const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
  await handleFiles(files);
});

clearBtn?.addEventListener('click', () => {
  if (confirm('確定要清除全部圖片嗎？')) {
    items = [];
    save(items);
    render();
  }
});

async function handleFiles(fileList) {
  for (const file of fileList) {
    const thumb = await createThumbnail(file);
    items.push({
      id: crypto.randomUUID(),
      dataUrl: thumb,
      name: file.name
    });
  }
  save(items);
  render();
}

function render() {
  if (!galleryEl) return;
  galleryEl.innerHTML = '';
  items.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'gcard';
    card.draggable = true;
    card.dataset.id = item.id;

    const img = document.createElement('img');
    img.src = item.dataUrl;
    img.alt = item.name;

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.textContent = '🗑️';
    delBtn.title = '刪除';
    delBtn.addEventListener('click', () => {
      items = items.filter(x => x.id !== item.id);
      save(items);
      render();
    });

    const dlBtn = document.createElement('button');
    dlBtn.className = 'icon-btn';
    dlBtn.textContent = '⬇️';
    dlBtn.title = '下載';
    dlBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = item.dataUrl;
      a.download = item.name || 'image.jpg';
      a.click();
    });

    toolbar.appendChild(dlBtn);
    toolbar.appendChild(delBtn);

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = item.name || '未命名';

    card.appendChild(img);
    card.appendChild(toolbar);
    card.appendChild(label);
    galleryEl.appendChild(card);

    // 拖曳排序（在卡片之間移動）
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', item.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingId = e.dataTransfer.getData('text/plain');
      if (!draggingId || draggingId === item.id) return;
      const from = items.findIndex(x => x.id === draggingId);
      const to = idx;
      if (from === -1 || to === -1 || from === to) return;
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      save(items);
      render();
    });
  });
}
