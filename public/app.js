// ==============================
// app.js  (เวอร์ชัน Performance + Lazy-load)
// ==============================
(function () {
  // ------------------------------
  // Helpers
  // ------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isTouch = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  // ------------------------------
  // Sidebar
  // ------------------------------
  const sideBar = $('.sidebar');
  const menu = $('.menu-icon');
  const closeIcon = $('.close-icon');

  const openSidebar = () => {
    if (!sideBar) return;
    sideBar.classList.remove('close-sidebar');
    sideBar.classList.add('open-sidebar');
  };
  const closeSidebar = () => {
    if (!sideBar) return;
    sideBar.classList.remove('open-sidebar');
    sideBar.classList.add('close-sidebar');
  };

  menu?.addEventListener('click', openSidebar);
  closeIcon?.addEventListener('click', closeSidebar);
  $$('.sidebar ul li a').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSidebar();
  });

  // ------------------------------
  // AOS (ลดงาน render ซ้ำ ๆ)
  // ------------------------------
  if (window.AOS) {
    AOS.init({
      once: true,          // แอนิเมชันแค่ครั้งเดียว
      duration: 700,       // เร็วขึ้นหน่อย
      easing: 'ease-out'
    });
  }

  // ------------------------------
  // Video handling (Lazy-load + Hover + Mobile)
  // ------------------------------
  const bgVideo = $('.back-vid'); // วิดีโอพื้นหลัง (อยู่บนจอทันที)
  const allVideos = $$('video');

  // ลดงานบนเครือข่ายช้า/โหมดประหยัดดาต้า
  const conn = navigator.connection || navigator.webkitConnection;
  const saveData = !!(conn && (conn.saveData || (conn.effectiveType || '').includes('2g')));

  // ถ้า user ขอ reduce motion ให้ปิด autoplay ทั้งหมด
  const prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ทำให้ hover-sign ทำงานแยกแต่ละการ์ด
  function wireProjectHoverAndClick(video) {
    const card = video.closest('.project-card');
    if (!card) return;
    const hoverSign = $('.hover-sign', card);

    // Desktop: hover = play/pause + hoverSign
    video.addEventListener('mouseover', () => {
      video.play().catch(() => {});
      hoverSign?.classList.add('active');
    });
    video.addEventListener('mouseout', () => {
      video.pause();
      hoverSign?.classList.remove('active');
    });

    // Mobile: tap = toggle
    video.addEventListener('click', () => {
      if (video.paused) {
        video.play().catch(() => {});
        hoverSign?.classList.add('active');
      } else {
        video.pause();
        hoverSign?.classList.remove('active');
      }
    });
  }

  // เตรียมวิดีโอให้ lazy โดยย้าย src -> data-src (เฉพาะที่ไม่จำเป็นต้องโหลดทันที)
  function prepareLazyVideo(video) {
    // ไม่ยุ่งกับวิดีโอพื้นหลังที่อยู่บนจอแรก
    if (video === bgVideo) return;

    // ถ้าผู้ใช้ประหยัดดาต้า/ลด motion: ปิด autoplay
    if (saveData || prefersReducedMotion) {
      video.removeAttribute('autoplay');
      video.pause?.();
    }

    // รองรับเคสที่ใช้ <video src="..."> เดิม:
    const directSrc = video.getAttribute('src');
    if (directSrc) {
      video.dataset.src = directSrc;
      video.removeAttribute('src');
      // preload none เพื่อลด network จนกว่าจะเข้า viewport
      video.setAttribute('preload', 'none');
    }

    // ถ้ามี <source src="..."> ให้ย้ายไป data-src
    const sources = $$('source', video);
    sources.forEach(s => {
      if (s.getAttribute('src')) {
        s.dataset.src = s.getAttribute('src');
        s.removeAttribute('src');
      }
    });

    // ถ้ายังไม่มี preload กำหนดเป็น none
    if (!video.hasAttribute('preload')) {
      video.setAttribute('preload', 'none');
    }
  }

  // ใส่ src จริงเมื่อเข้า viewport
  function loadVideoSources(video) {
    const sources = $$('source[data-src]', video);
    if (sources.length) {
      sources.forEach(s => {
        s.setAttribute('src', s.dataset.src);
        s.removeAttribute('data-src');
      });
      video.load();
    } else if (video.dataset.src) {
      video.setAttribute('src', video.dataset.src);
      video.removeAttribute('data-src');
      // ไม่จำเป็นต้อง video.load() ในทุกเบราว์เซอร์ แต่ใส่ไว้ปลอดภัย
      try { video.load(); } catch {}
    }
  }

  // Lazy-load เมื่อเข้าใกล้หน้าจอ + Pause เมื่อพ้นหน้าจอ
  const lazyIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const v = entry.target;
      if (entry.isIntersecting) {
        loadVideoSources(v);
        // เล่นอัตโนมัติถ้าถูกตั้งค่าไว้ และผู้ใช้ไม่ได้ saveData/reduceMotion
        if (v.autoplay && !saveData && !prefersReducedMotion) {
          v.play().catch(() => {});
        }
      } else {
        // นอกจอ ให้ pause ลด CPU/แบต
        v.pause?.();
      }
    });
  }, { rootMargin: '300px' });

  // เตรียมทุกวิดีโอ
  allVideos.forEach(v => {
    // ให้แน่ใจว่ามี muted + playsinline เพื่อให้ autoplay ได้บนมือถือ
    v.muted = true;
    v.setAttribute('playsinline', '');

    // Project cards: wire hover/click
    wireProjectHoverAndClick(v);

    // ทำ lazy สำหรับทุกวิดีโอ ยกเว้นพื้นหลัง (bgVideo)
    prepareLazyVideo(v);

    // เฝ้าดูด้วย IO
    lazyIO.observe(v);
  });

  // ถ้าวิดีโอพื้นหลังมี src แล้ว ให้เริ่มเล่นแบบเงียบ ๆ
  if (bgVideo) {
    bgVideo.muted = true;
    bgVideo.setAttribute('playsinline', '');
    // ถ้าอยู่นอกจอ (กรณีเลย์เอาต์บางแบบ) IO จะ handle ให้
    bgVideo.play?.().catch(() => {});
  }

  // ------------------------------
  // ปรับแต่งเล็กน้อยสำหรับ performance
  // ------------------------------
  // ปิด pointer events ชั่วคราวตอน scroll เร็ว ๆ (ลด repaint hover)
  let scrolling;
  window.addEventListener('scroll', () => {
    document.body.classList.add('is-scrolling');
    clearTimeout(scrolling);
    scrolling = setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 120);
  }, { passive: true });

  // ปิดแอนิเมชันหนัก ๆ เมื่อ reduce-motion
  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduce-motion');
  }
})();
