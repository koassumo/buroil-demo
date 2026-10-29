/* БурОйл: поведение лендинга. Без хранилищ браузера, без cookie, без запросов в сеть.
   Всё, что здесь есть, украшение: без JS страница полностью читается и работает. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var scrollOpts = function () { return reduce.matches ? { behavior: "auto" } : { behavior: "smooth" }; };

  /* Панель макета: стиль и тема, только на время просмотра.
     Адрес ?style=info&theme=dark задаёт их при открытии (для ссылок на макет), ничего не запоминается */
  var q = new URLSearchParams(location.search);
  if (q.get("style") === "info" || q.get("style") === "impress") root.setAttribute("data-style", q.get("style"));
  if (q.get("theme") === "dark" || q.get("theme") === "light") root.setAttribute("data-theme", q.get("theme"));
  document.querySelectorAll("[data-set-style],[data-set-theme]").forEach(function (b) {
    var v = b.getAttribute("data-set-style") || b.getAttribute("data-set-theme");
    var cur = b.hasAttribute("data-set-style") ? root.getAttribute("data-style") : (root.getAttribute("data-theme") || "auto");
    b.setAttribute("aria-pressed", v === cur ? "true" : "false");
  });
  document.querySelectorAll("[data-set-style],[data-set-theme]").forEach(function (b) {
    b.addEventListener("click", function () {
      var style = b.getAttribute("data-set-style"), theme = b.getAttribute("data-set-theme");
      if (style) root.setAttribute("data-style", style);
      if (theme) { if (theme === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", theme); }
      var group = b.parentNode.querySelectorAll("button");
      group.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      syncLinks();
    });
  });
  /* Выбранные стиль и тема переносятся на другие страницы макета через адрес ссылки (хранилищ нет) */
  function syncLinks() {
    var style = root.getAttribute("data-style"), theme = root.getAttribute("data-theme");
    document.querySelectorAll('a[href*=".html"]').forEach(function (a) {
      var href = a.getAttribute("href");
      if (/^[a-z]+:/i.test(href)) return;
      var parts = href.split("#"), base = parts[0].split("?")[0], p = [];
      if (style && style !== "impress") p.push("style=" + style);
      if (theme) p.push("theme=" + theme);
      a.setAttribute("href", base + (p.length ? "?" + p.join("&") : "") + (parts[1] ? "#" + parts[1] : ""));
    });
    if (history.replaceState) {
      var cur = [];
      if (style && style !== "impress") cur.push("style=" + style);
      if (theme) cur.push("theme=" + theme);
      history.replaceState(null, "", location.pathname + (cur.length ? "?" + cur.join("&") : "") + location.hash);
    }
  }
  syncLinks();

  /* Полоса прогресса прокрутки в шапке */
  var bar = document.getElementById("progress");
  function progress() {
    if (!bar) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty("--p", h > 0 ? Math.min(1, window.scrollY / h).toFixed(4) : 0);
  }

  /* Кнопка «Наверх» */
  var totop = document.getElementById("totop");
  if (totop) {
    totop.addEventListener("click", function () { window.scrollTo(Object.assign({ top: 0 }, scrollOpts())); });
  }
  function toTopState() { if (totop) totop.classList.toggle("show", window.scrollY > window.innerHeight * 0.8); }

  /* Линия порядка работы: заполняется по мере прокрутки, пройденные шаги закрашены */
  var steps = document.getElementById("steps");
  function stepsProgress() {
    if (!steps) return;
    var r = steps.getBoundingClientRect();
    var anchor = window.innerHeight * 0.66;
    var p = (anchor - r.top) / r.height;
    p = Math.max(0, Math.min(1, p));
    steps.style.setProperty("--p", p.toFixed(3));
    var items = steps.children;
    for (var i = 0; i < items.length; i++) {
      var ir = items[i].getBoundingClientRect();
      items[i].setAttribute("data-done", ir.top + 20 < anchor ? "true" : "false");
    }
  }

  /* Появление блоков: основной путь IntersectionObserver (ниже), запасной путь по прокрутке,
     чтобы блок не остался скрытым, если наблюдатель не сработал (переход по якорю, фоновая вкладка) */
  var reveals = document.querySelectorAll(".reveal");
  function revealFallback() {
    var limit = window.innerHeight;
    for (var i = 0; i < reveals.length; i++) {
      var el = reveals[i];
      if (!el.classList.contains("in") && el.getBoundingClientRect().top < limit) el.classList.add("in");
    }
  }

  /* Содержание юридической страницы: подсвечен последний заголовок, прошедший верхнюю треть экрана */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll("#doc-toc a"));
  var tocHeads = tocLinks.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  function tocSpy() {
    if (!tocLinks.length) return;
    var line = window.innerHeight * 0.35, cur = -1;
    for (var i = 0; i < tocHeads.length; i++) {
      if (tocHeads[i] && tocHeads[i].getBoundingClientRect().top <= line) cur = i;
    }
    tocLinks.forEach(function (a, i) { if (i === cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { progress(); toTopState(); stepsProgress(); revealFallback(); tocSpy(); ticking = false; });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* Появление блоков при прокрутке */
  if ("IntersectionObserver" in window && !reduce.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* Подсветка текущего раздела в меню и текущего направления в списке */
  function spy(links, targets, attr) {
    if (!("IntersectionObserver" in window) || !targets.length) return;
    var current = null;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) current = e.target; });
      if (!current) return;
      links.forEach(function (a) {
        if (a.getAttribute("href") === "#" + current.id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
      if (attr) targets.forEach(function (t) { t.setAttribute(attr, t === current ? "true" : "false"); });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    targets.forEach(function (t) { obs.observe(t); });
  }
  /* Шапка и меню телефона: наблюдаются все разделы, у раздела без пункта меню подсветка снимается */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a, .menu-panel nav a"));
  var navTargets = Array.prototype.slice.call(document.querySelectorAll("main > section[id]"));
  spy(navLinks, navTargets, null);
  var idxLinks = Array.prototype.slice.call(document.querySelectorAll("#dir-index a"));
  var idxTargets = idxLinks.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
  spy(idxLinks, idxTargets, "data-active");

  /* Раскрыть или свернуть подробности всех направлений */
  var toggle = document.getElementById("toggle-all");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      document.querySelectorAll("#dir-list details").forEach(function (d) { d.open = open; });
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Свернуть все подробности" : "Раскрыть все подробности";
    });
  }

  /* Меню телефона: закрывается нажатием мимо, клавишей Escape и после перехода по ссылке */
  var menu = document.getElementById("menu");
  if (menu) {
    document.addEventListener("click", function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary").focus(); }
    });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { menu.open = false; }); });
  }

  /* Пятно света на первом экране: само медленно блуждает по правой части, над первым экраном
     тянется к курсору с запаздыванием; работает только пока первый экран виден; при reduced-motion стоит */
  var hero = document.querySelector(".hero"), heroBg = document.querySelector(".hero-bg");
  if (hero && heroBg && !reduce.matches && window.requestAnimationFrame) {
    var sp = { x: 0.78, y: 0.28, tx: 0.78, ty: 0.28, mouse: false, raf: null, t0: performance.now() };
    function wander(t) {
      sp.tx = 0.66 + 0.2 * Math.sin(t * 0.00021) + 0.06 * Math.sin(t * 0.00057);
      sp.ty = 0.42 + 0.26 * Math.cos(t * 0.00017) + 0.06 * Math.cos(t * 0.00049);
    }
    function frame(now) {
      if (!sp.mouse) wander(now - sp.t0);
      var k = sp.mouse ? 0.08 : 0.03;
      sp.x += (sp.tx - sp.x) * k;
      sp.y += (sp.ty - sp.y) * k;
      heroBg.style.setProperty("--sx", (sp.x * 100).toFixed(2) + "%");
      heroBg.style.setProperty("--sy", (sp.y * 100).toFixed(2) + "%");
      sp.raf = requestAnimationFrame(frame);
    }
    function spotStart() { if (!sp.raf) sp.raf = requestAnimationFrame(frame); }
    function spotStop() { if (sp.raf) { cancelAnimationFrame(sp.raf); sp.raf = null; } }
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      sp.tx = (e.clientX - r.left) / r.width;
      sp.ty = (e.clientY - r.top) / r.height;
      sp.mouse = true;
    });
    hero.addEventListener("mouseleave", function () { sp.mouse = false; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) spotStart(); else spotStop(); });
      }, { threshold: 0.01 }).observe(hero);
    } else {
      spotStart();
    }
  }

  /* Переход по якорю раскрывает нужное направление, если ссылка ведёт внутрь него */
  function openTarget() {
    var id = location.hash.slice(1);
    if (!id) return;
    var t = document.getElementById(id);
    if (t && t.classList.contains("dir")) t.classList.add("in");
  }
  window.addEventListener("hashchange", function () { openTarget(); onScroll(); });
  window.addEventListener("load", onScroll);
  openTarget();
})();
