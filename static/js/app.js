/* Charlotte — app.js
   Minimal vanilla JS: image preview, toggle sync, confirm dialogs. */

(function () {
    'use strict';

    // ── Avatar preview (single image) ───────────────────────────────────────
    var avatarInput = document.getElementById('avatar-input');
    var avatarPreview = document.getElementById('avatar-preview');
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            var reader = new FileReader();
            reader.onload = function (e) {
                avatarPreview.src = e.target.result;
                avatarPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }

    // ── Photo file count indicator (multiple upload) ─────────────────────────
    var photoInput = document.getElementById('photo-input');
    var photoCount = document.getElementById('photo-count');
    if (photoInput && photoCount) {
        photoInput.addEventListener('change', function () {
            var n = this.files ? this.files.length : 0;
            if (n === 0) {
                photoCount.textContent = '';
            } else if (n === 1) {
                photoCount.textContent = '1 file selected';
            } else {
                photoCount.textContent = n + ' files selected';
            }
        });
    }

    // ── Confirm dialogs for destructive actions ──────────────────────────────
    document.addEventListener('submit', function (e) {
        var form = e.target;
        var msg = form.getAttribute('data-confirm');
        if (!msg) return;
        if (!window.confirm(msg)) {
            e.preventDefault();
        }
    });

    // ── Feature toggle labels ────────────────────────────────────────────────
    // Keep the .feature-toggle card style in sync with its checkbox state.
    document.querySelectorAll('.feature-toggle input[type="checkbox"]').forEach(function (cb) {
        function update() {
            var card = cb.closest('.feature-toggle');
            if (!card) return;
            if (cb.checked) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        }
        update();
        cb.addEventListener('change', update);
    });

    // ── Toggle thumb sync (CSS handles most of it; this ensures no JS state mismatch) ──
    // Nothing extra needed — CSS :checked does the work.

    // ── Flash message auto-dismiss ───────────────────────────────────────────
    var flash = document.querySelector('.alert');
    if (flash) {
        setTimeout(function () {
            flash.style.transition = 'opacity 0.4s ease';
            flash.style.opacity = '0';
            setTimeout(function () { flash.remove(); }, 400);
        }, 5000);
    }

    // ── Dynamic link editor in profile form ─────────────────────────────────
    var addLinkBtn = document.getElementById('add-link-btn');
    var linksContainer = document.getElementById('links-container');
    if (addLinkBtn && linksContainer) {
        addLinkBtn.addEventListener('click', function () {
            var rows = linksContainer.querySelectorAll('.link-row');
            if (rows.length >= 10) return;
            var idx = rows.length;
            var row = document.createElement('div');
            row.className = 'link-row form-row mt-2';
            row.innerHTML =
                '<input type="text" class="form-control" name="link_label_' + idx + '" placeholder="Label (e.g. GitHub)">' +
                '<input type="url" class="form-control" name="link_url_' + idx + '" placeholder="https://">';
            linksContainer.appendChild(row);
        });
    }

    // ── Gallery lightbox ─────────────────────────────────────────────────────
    var lightbox = document.getElementById('lightbox');
    var lbImg    = document.getElementById('lb-img');
    var lbCap    = document.getElementById('lb-caption');
    var lbClose  = document.getElementById('lb-close');
    var lbPrev   = document.getElementById('lb-prev');
    var lbNext   = document.getElementById('lb-next');

    if (lightbox) {
        var items = Array.from(document.querySelectorAll('#gallery-grid .gallery-item--btn'));
        var current = 0;

        function openLightbox(idx) {
            current = idx;
            var item = items[current];
            lbImg.src = item.dataset.src;
            lbImg.alt = item.dataset.caption || '';
            lbCap.textContent = item.dataset.caption || '';
            lightbox.classList.add('is-open');
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            lbImg.focus();
        }

        function closeLightbox() {
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        function showPrev() {
            current = (current - 1 + items.length) % items.length;
            openLightbox(current);
        }

        function showNext() {
            current = (current + 1) % items.length;
            openLightbox(current);
        }

        items.forEach(function (item, idx) {
            item.addEventListener('click', function () { openLightbox(idx); });
        });

        if (lbClose) lbClose.addEventListener('click', closeLightbox);
        if (lbPrev)  lbPrev.addEventListener('click', showPrev);
        if (lbNext)  lbNext.addEventListener('click', showNext);

        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox) closeLightbox();
        });

        document.addEventListener('keydown', function (e) {
            if (!lightbox.classList.contains('is-open')) return;
            if (e.key === 'Escape')      closeLightbox();
            if (e.key === 'ArrowLeft')   showPrev();
            if (e.key === 'ArrowRight')  showNext();
        });
    }

}());
