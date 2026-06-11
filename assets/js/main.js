/* ============================================================
   sohanmehta.com.np — all interactions, zero libraries.
   ============================================================ */
(function () {
    'use strict';

    const $ = (s, c) => (c || document).querySelector(s);
    const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const rand = (a, b) => a + Math.random() * (b - a);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    const PALETTE = ['#FF6B35', '#4D96FF', '#FFD23F', '#06D6A0', '#FF70A6'];

    /* ============================================================
       TOASTS + ACHIEVEMENTS
       ============================================================ */
    const toastZone = $('#toast-zone');
    const unlocked = new Set();

    function toast(msg) {
        if (!toastZone) return;
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        toastZone.appendChild(t);
        while (toastZone.children.length > 3) toastZone.firstChild.remove();
        setTimeout(() => t.classList.add('bye'), 3400);
        setTimeout(() => t.remove(), 3800);
    }

    function achieve(key, msg) {
        if (unlocked.has(key)) return;
        unlocked.add(key);
        toast(msg);
    }

    /* ============================================================
       CONFETTI ENGINE
       ============================================================ */
    const confetti = (function () {
        const canvas = $('#confetti-canvas');
        if (!canvas) return { burst: () => { }, rain: () => { } };
        const ctx = canvas.getContext('2d');
        let parts = [];
        let rafId = null;
        let rainUntil = 0;
        let last = 0;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        function spawn(x, y, vx, vy) {
            parts.push({
                x, y, vx, vy,
                w: rand(5, 11),
                h: rand(8, 16),
                rot: rand(0, Math.PI * 2),
                vr: rand(-0.25, 0.25),
                color: PALETTE[(Math.random() * PALETTE.length) | 0],
                shape: Math.random() < 0.35 ? 'circle' : 'rect',
                life: 1
            });
        }

        function tick(now) {
            const dt = clamp((now - last) / 16.7, 0.5, 2.5);
            last = now;

            if (now < rainUntil) {
                for (let i = 0; i < 5; i++) {
                    spawn(rand(0, canvas.width), -20, rand(-1.5, 1.5), rand(2, 5));
                }
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.vy += 0.22 * dt;
                p.vx *= 0.992;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rot += p.vr * dt;
                if (p.y > canvas.height + 30) { parts.splice(i, 1); continue; }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                if (p.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                }
                ctx.restore();
            }

            if (parts.length || performance.now() < rainUntil) {
                rafId = requestAnimationFrame(tick);
            } else {
                rafId = null;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        function ensure() {
            if (rafId === null) {
                last = performance.now();
                rafId = requestAnimationFrame(tick);
            }
        }

        return {
            burst(x, y, n) {
                if (reducedMotion) return;
                n = n || 60;
                for (let i = 0; i < n; i++) {
                    const ang = rand(0, Math.PI * 2);
                    const spd = rand(2, 11);
                    spawn(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd - 4);
                }
                ensure();
            },
            rain(ms) {
                if (reducedMotion) return;
                rainUntil = performance.now() + ms;
                ensure();
            }
        };
    })();

    /* ============================================================
       THEME TOGGLE
       ============================================================ */
    (function () {
        const btn = $('#theme-toggle');
        if (!btn) return;
        const icon = $('.theme-toggle__icon', btn);
        const root = document.documentElement;

        function apply(theme) {
            root.setAttribute('data-theme', theme);
            if (icon) icon.textContent = theme === 'dark' ? '🌙' : '🌞';
        }

        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        apply(saved || (prefersDark ? 'dark' : 'light'));

        btn.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            btn.classList.add('flipping');
            setTimeout(() => {
                apply(next);
                btn.classList.remove('flipping');
            }, 180);
            localStorage.setItem('theme', next);
            achieve('theme', next === 'dark' ? '🌙 Welcome to the dark side.' : '🌞 Let there be light!');
        });
    })();

    /* ============================================================
       NAV — mobile menu, scroll spy, progress bar
       ============================================================ */
    (function () {
        const header = $('#site-header');
        const toggle = $('#nav-toggle');
        const links = $$('.nav__link');

        if (toggle && header) {
            toggle.addEventListener('click', () => header.classList.toggle('menu-open'));
            links.forEach(l => l.addEventListener('click', () => header.classList.remove('menu-open')));
        }

        const sections = $$('section[id]');
        const bar = $('#progress-bar');
        let ticking = false;

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                const y = window.scrollY;

                if (bar) {
                    const max = document.documentElement.scrollHeight - window.innerHeight;
                    bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
                }

                sections.forEach(sec => {
                    const top = sec.offsetTop - 120;
                    const link = $('.nav__menu a[href="#' + sec.id + '"]');
                    if (!link) return;
                    if (y >= top && y < top + sec.offsetHeight) {
                        links.forEach(l => l.classList.remove('active'));
                        link.classList.add('active');
                    }
                });
            });
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    })();

    /* ============================================================
       CUSTOM CURSOR (desktop only)
       ============================================================ */
    (function () {
        if (!finePointer || reducedMotion) return;
        const dot = $('#cursor-dot');
        const ring = $('#cursor-ring');
        if (!dot || !ring) return;

        document.documentElement.classList.add('fancy-cursor');

        let mx = -100, my = -100, rx = -100, ry = -100;

        window.addEventListener('mousemove', e => {
            mx = e.clientX;
            my = e.clientY;
            dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
        }, { passive: true });

        (function follow() {
            rx += (mx - rx) * 0.16;
            ry += (my - ry) * 0.16;
            ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
            requestAnimationFrame(follow);
        })();

        document.addEventListener('mouseover', e => {
            const hot = e.target.closest('a, button, .ball, .sticker, .polaroid, .glyph');
            ring.classList.toggle('is-hot', !!hot);
        });
    })();

    /* ============================================================
       HERO — name glyphs, typewriter, photo, stickers, doodles
       ============================================================ */

    // split name into bouncy letters
    (function () {
        const nameEl = $('#hero-name');
        if (!nameEl) return;
        const words = nameEl.textContent.trim().split(/\s+/);
        nameEl.textContent = '';
        words.forEach((word, wi) => {
            const w = document.createElement('span');
            w.className = 'word';
            for (const ch of word) {
                const g = document.createElement('span');
                g.className = 'glyph';
                g.textContent = ch;
                w.appendChild(g);
            }
            nameEl.appendChild(w);
            if (wi < words.length - 1) nameEl.appendChild(document.createTextNode(' '));
        });

        nameEl.addEventListener('mouseover', e => {
            const g = e.target.closest('.glyph');
            if (g) g.classList.add('boing');
        });
        nameEl.addEventListener('animationend', e => {
            if (e.target.classList && e.target.classList.contains('glyph')) {
                e.target.classList.remove('boing');
            }
        });
        nameEl.addEventListener('click', e => {
            const g = e.target.closest('.glyph');
            if (!g) return;
            const r = g.getBoundingClientRect();
            confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 18);
            g.classList.add('boing');
        });
    })();

    // typewriter
    (function () {
        const el = $('#typewriter');
        if (!el) return;
        const phrases = [
            'I build Flutter apps 📱',
            'I vibe code with AI agents 🤖',
            'I ship to both stores 🚀',
            'I automate the boring parts ⚙️',
            'I fix bugs (mine, usually) 🐛'
        ];

        if (reducedMotion) {
            el.textContent = phrases[0];
            return;
        }

        let pi = 0, ci = 0, deleting = false;

        function step() {
            const phrase = phrases[pi];
            if (!deleting) {
                ci++;
                el.textContent = phrase.slice(0, ci);
                if (ci === phrase.length) {
                    deleting = true;
                    setTimeout(step, 1700);
                    return;
                }
                setTimeout(step, rand(55, 110));
            } else {
                ci--;
                el.textContent = phrase.slice(0, ci);
                if (ci === 0) {
                    deleting = false;
                    pi = (pi + 1) % phrases.length;
                    setTimeout(step, 350);
                    return;
                }
                setTimeout(step, 32);
            }
        }
        step();
    })();

    // polaroid photo
    (function () {
        const photo = $('#hero-photo');
        if (!photo) return;
        let clicks = 0;
        photo.addEventListener('click', e => {
            photo.classList.remove('spin');
            void photo.offsetWidth; // restart animation
            photo.classList.add('spin');
            confetti.burst(e.clientX, e.clientY, 40);
            clicks++;
            if (clicks === 5) achieve('photo', '📸 My face appreciates the attention.');
        });
        photo.addEventListener('animationend', () => photo.classList.remove('spin'));
    })();

    // draggable stickers
    (function () {
        $$('.sticker').forEach(st => {
            st.addEventListener('pointerdown', e => {
                e.preventDefault();
                const parent = st.offsetParent || st.parentElement;
                const pRect = parent.getBoundingClientRect();
                const sRect = st.getBoundingClientRect();

                // switch to explicit left/top positioning
                st.style.left = (sRect.left - pRect.left) + 'px';
                st.style.top = (sRect.top - pRect.top) + 'px';
                st.style.right = 'auto';
                st.style.bottom = 'auto';
                st.classList.add('dragging');
                st.setPointerCapture(e.pointerId);

                const offX = e.clientX - sRect.left;
                const offY = e.clientY - sRect.top;

                function move(ev) {
                    st.style.left = (ev.clientX - pRect.left - offX) + 'px';
                    st.style.top = (ev.clientY - pRect.top - offY) + 'px';
                }
                function up() {
                    st.classList.remove('dragging');
                    st.classList.add('plopped');
                    st.removeEventListener('pointermove', move);
                    st.removeEventListener('pointerup', up);
                    st.removeEventListener('pointercancel', up);
                    achieve('sticker', '🧲 Sticker rearranger. Interior designer next?');
                }
                st.addEventListener('pointermove', move);
                st.addEventListener('pointerup', up);
                st.addEventListener('pointercancel', up);
            });
            st.addEventListener('animationend', e => {
                if (e.animationName === 'sticker-plop') st.classList.remove('plopped');
            });
        });
    })();

    // doodle parallax
    (function () {
        if (!finePointer || reducedMotion) return;
        const hero = $('.hero');
        const doodles = $$('.doodle');
        if (!hero || !doodles.length) return;
        hero.addEventListener('pointermove', e => {
            const cx = e.clientX / window.innerWidth - 0.5;
            const cy = e.clientY / window.innerHeight - 0.5;
            doodles.forEach(d => {
                const depth = parseFloat(d.dataset.depth || '15');
                d.style.transform = 'translate(' + (-cx * depth) + 'px,' + (-cy * depth) + 'px)';
            });
        }, { passive: true });
    })();

    /* ============================================================
       MAGNETIC BUTTONS + CARD TILT (desktop only)
       ============================================================ */
    (function () {
        if (!finePointer || reducedMotion) return;

        $$('.magnet').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height / 2);
                el.style.transform = 'translate(' + dx * 0.22 + 'px,' + dy * 0.22 + 'px)';
            });
            el.addEventListener('pointerleave', () => {
                el.style.transform = '';
            });
        });

        $$('.tilt').forEach(card => {
            card.addEventListener('pointermove', e => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                const rx = (0.5 - py) * 7;
                const ry = (px - 0.5) * 7;
                card.style.transform =
                    'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) rotate(var(--rot, 0deg))';
            });
            card.addEventListener('pointerleave', () => {
                card.style.transform = '';
            });
        });
    })();

    /* ============================================================
       SCROLL REVEAL
       ============================================================ */
    (function () {
        const els = $$('.reveal');
        if (!els.length || !('IntersectionObserver' in window)) {
            els.forEach(el => el.classList.add('in'));
            return;
        }
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    en.target.classList.add('in');
                    io.unobserve(en.target);
                    // drop the reveal classes once done so they stop
                    // overriding hover/tilt transitions
                    setTimeout(() => en.target.classList.remove('reveal', 'in'), 900);
                }
            });
        }, { threshold: 0.12 });
        els.forEach(el => io.observe(el));
    })();

    /* ============================================================
       THE SKILL PIT — tiny verlet-ish ball physics
       ============================================================ */
    (function () {
        const pit = $('#skill-pit');
        if (!pit) return;

        const SKILLS = [
            ['Flutter', 'bxl-flutter'],
            ['Dart', 'bx-code-alt'],
            ['Firebase', 'bxl-firebase'],
            ['HTML', 'bxl-html5'],
            ['CSS', 'bxl-css3'],
            ['Tailwind', 'bxl-tailwind-css'],
            ['WordPress', 'bxl-wordpress'],
            ['BLoC', 'bx-cube'],
            ['Shorebird', 'bx-water'],
            ['FlutterFlow', 'bx-git-commit'],
            ['Clerk', 'bx-lock-alt'],
            ['C/C++', 'bxl-c-plus-plus'],
            ['Postman', 'bx-terminal'],
            ['Android', 'bxl-android'],
            ['iOS', 'bxl-apple'],
            ['GitHub', 'bxl-github']
        ];

        const G = 2400;          // gravity px/s²
        const REST = 0.55;       // ball-ball bounciness
        const FLOOR_REST = 0.45; // floor bounciness
        const balls = [];
        let W = 0, H = 0;
        let running = false;
        let spawned = false;
        let lastT = 0;

        function bounds() {
            W = pit.clientWidth;
            H = pit.clientHeight;
        }

        function makeBalls() {
            pit.innerHTML = '';
            balls.length = 0;
            bounds();
            const D = W < 600 ? 62 : 86;
            const r = D / 2;
            const perRow = Math.max(1, Math.floor((W - 8) / (D + 4)));

            SKILLS.forEach((s, i) => {
                const el = document.createElement('div');
                el.className = 'ball';
                el.style.width = D + 'px';
                el.style.height = D + 'px';
                el.style.setProperty('--c', PALETTE[i % PALETTE.length]);
                const small = s[0].length > 8;
                el.innerHTML =
                    '<i class="bx ' + s[1] + '"' + (D < 70 ? ' style="font-size:1.25rem"' : '') + '></i>' +
                    '<span' + ((small || D < 70) ? ' style="font-size:0.54rem"' : '') + '>' + s[0] + '</span>';
                pit.appendChild(el);

                const b = {
                    el: el,
                    r: r,
                    x: rand(r + 4, W - r - 4),
                    y: reducedMotion
                        ? H - r - 2 - Math.floor(i / perRow) * (D - 4)
                        : -r - i * (D * 0.75) - rand(0, 40),
                    vx: rand(-60, 60),
                    vy: 0,
                    held: false,
                    trail: []
                };
                if (reducedMotion) {
                    b.x = clamp((r + 6) + (i % perRow) * (D + 4), b.r, W - b.r);
                }
                balls.push(b);
                attachGrab(b);
                draw(b);
            });
        }

        function draw(b) {
            b.el.style.transform = 'translate(' + (b.x - b.r) + 'px,' + (b.y - b.r) + 'px)';
        }

        function attachGrab(b) {
            b.el.addEventListener('pointerdown', e => {
                e.preventDefault();
                b.held = true;
                b.el.classList.add('held');
                b.el.setPointerCapture(e.pointerId);
                const rect = pit.getBoundingClientRect();
                const offX = e.clientX - rect.left - b.x;
                const offY = e.clientY - rect.top - b.y;
                b.trail = [{ x: b.x, y: b.y, t: performance.now() }];

                function move(ev) {
                    b.x = clamp(ev.clientX - rect.left - offX, b.r, W - b.r);
                    b.y = Math.min(ev.clientY - rect.top - offY, H - b.r);
                    b.trail.push({ x: b.x, y: b.y, t: performance.now() });
                    if (b.trail.length > 6) b.trail.shift();
                    draw(b);
                }
                function up() {
                    b.held = false;
                    b.el.classList.remove('held');
                    b.el.removeEventListener('pointermove', move);
                    b.el.removeEventListener('pointerup', up);
                    b.el.removeEventListener('pointercancel', up);

                    // velocity from recent trail
                    const now = performance.now();
                    const old = b.trail.find(p => now - p.t < 120) || b.trail[0];
                    const dt = Math.max((now - old.t) / 1000, 0.016);
                    b.vx = clamp((b.x - old.x) / dt, -2600, 2600);
                    b.vy = clamp((b.y - old.y) / dt, -2600, 2600);

                    const speed = Math.hypot(b.vx, b.vy);
                    if (speed > 1500) achieve('yeet', '🏀 YEET! +10 style points.');
                }
                b.el.addEventListener('pointermove', move);
                b.el.addEventListener('pointerup', up);
                b.el.addEventListener('pointercancel', up);
            });
        }

        function step(dt) {
            // integrate
            for (const b of balls) {
                if (b.held) continue;
                b.vy += G * dt;
                b.x += b.vx * dt;
                b.y += b.vy * dt;

                // walls
                if (b.x < b.r) { b.x = b.r; b.vx = -b.vx * 0.6; }
                if (b.x > W - b.r) { b.x = W - b.r; b.vx = -b.vx * 0.6; }
                // floor
                if (b.y > H - b.r) {
                    b.y = H - b.r;
                    b.vy = -b.vy * FLOOR_REST;
                    if (Math.abs(b.vy) < 60) b.vy = 0;
                    b.vx *= 0.96;
                    if (Math.abs(b.vx) < 4) b.vx = 0;
                }
            }

            // ball-ball collisions
            for (let i = 0; i < balls.length; i++) {
                for (let j = i + 1; j < balls.length; j++) {
                    const a = balls[i], c = balls[j];
                    const dx = c.x - a.x, dy = c.y - a.y;
                    const minD = a.r + c.r;
                    const d2 = dx * dx + dy * dy;
                    if (d2 >= minD * minD || d2 === 0) continue;

                    const d = Math.sqrt(d2);
                    const nx = dx / d, ny = dy / d;
                    const overlap = minD - d;

                    if (a.held && c.held) continue;

                    // positional correction
                    if (a.held) {
                        c.x += nx * overlap; c.y += ny * overlap;
                    } else if (c.held) {
                        a.x -= nx * overlap; a.y -= ny * overlap;
                    } else {
                        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
                        c.x += nx * overlap / 2; c.y += ny * overlap / 2;
                    }

                    // impulse
                    const rvn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
                    if (rvn < 0) {
                        if (a.held) {
                            c.vx -= (1 + REST) * rvn * nx;
                            c.vy -= (1 + REST) * rvn * ny;
                        } else if (c.held) {
                            a.vx += (1 + REST) * rvn * nx;
                            a.vy += (1 + REST) * rvn * ny;
                        } else {
                            const imp = -(1 + REST) * rvn / 2;
                            a.vx -= imp * nx; a.vy -= imp * ny;
                            c.vx += imp * nx; c.vy += imp * ny;
                        }
                    }
                }
            }

            for (const b of balls) {
                if (!b.held) {
                    if (b.x < b.r) b.x = b.r;
                    if (b.x > W - b.r) b.x = W - b.r;
                    if (b.y > H - b.r) b.y = H - b.r;
                }
                draw(b);
            }
        }

        function loop(t) {
            if (!running) return;
            const dt = clamp((t - lastT) / 1000, 0.001, 0.032);
            lastT = t;
            step(dt);
            requestAnimationFrame(loop);
        }

        function start() {
            if (running) return;
            running = true;
            lastT = performance.now();
            requestAnimationFrame(loop);
        }

        function stop() {
            running = false;
        }

        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    if (!spawned) {
                        spawned = true;
                        makeBalls();
                    }
                    if (!reducedMotion) start();
                } else {
                    stop();
                }
            });
        }, { threshold: 0.1 });
        io.observe(pit);

        const reset = $('#pit-reset');
        if (reset) {
            reset.addEventListener('click', () => {
                makeBalls();
                if (!reducedMotion) start();
            });
        }

        let resizeT;
        window.addEventListener('resize', () => {
            clearTimeout(resizeT);
            resizeT = setTimeout(() => {
                if (!spawned) return;
                const oldW = W;
                bounds();
                if (Math.abs(W - oldW) > 120) {
                    makeBalls();
                } else {
                    balls.forEach(b => {
                        b.x = clamp(b.x, b.r, W - b.r);
                        b.y = Math.min(b.y, H - b.r);
                        draw(b);
                    });
                }
            }, 200);
        });
    })();

    /* ============================================================
       EASTER EGGS
       ============================================================ */

    // konami code → party mode
    (function () {
        const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
            'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let idx = 0;
        let partying = false;

        window.addEventListener('keydown', e => {
            const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            idx = (k === SEQ[idx]) ? idx + 1 : (k === SEQ[0] ? 1 : 0);
            if (idx === SEQ.length) {
                idx = 0;
                party();
            }
        });

        function party() {
            if (partying) return;
            partying = true;
            document.body.classList.add('party');
            achieve('party', '🪩 PARTY MODE. You found it.');
            confetti.rain(8000);

            let h = 0;
            const root = document.documentElement;
            const disco = setInterval(() => {
                h = (h + 14) % 360;
                root.style.setProperty('--acc', 'hsl(' + h + ', 90%, 58%)');
                root.style.setProperty('--acc2', 'hsl(' + ((h + 120) % 360) + ', 90%, 62%)');
                root.style.setProperty('--pink', 'hsl(' + ((h + 240) % 360) + ', 90%, 70%)');
            }, 120);

            setTimeout(() => {
                clearInterval(disco);
                root.style.removeProperty('--acc');
                root.style.removeProperty('--acc2');
                root.style.removeProperty('--pink');
                document.body.classList.remove('party');
                partying = false;
            }, 8000);
        }
    })();

    // logo clicks → barrel roll
    (function () {
        const logo = $('#logo');
        if (!logo) return;
        let clicks = 0;
        logo.addEventListener('click', () => {
            clicks++;
            if (clicks >= 7 && !reducedMotion) {
                clicks = 0;
                document.body.classList.add('barrel');
                achieve('barrel', '🛞 Do a barrel roll!');
                setTimeout(() => document.body.classList.remove('barrel'), 1300);
            }
        });
    })();

    // the button you were told not to press
    (function () {
        const btn = $('#do-not-press');
        if (!btn) return;
        const lines = [
            '🚨 You had ONE job.',
            '😤 Again?? Bold move.',
            '🫠 Fine. Here’s more confetti.',
            '🤝 At this point we’re friends.',
            '♾️ This button never runs out. Neither do I.'
        ];
        let presses = 0;
        btn.addEventListener('click', e => {
            const r = btn.getBoundingClientRect();
            confetti.burst(r.left + r.width / 2, r.top, 120);
            if (!reducedMotion) {
                document.body.classList.remove('shake');
                void document.body.offsetWidth;
                document.body.classList.add('shake');
            }
            toast(lines[Math.min(presses, lines.length - 1)]);
            presses++;
        });
        document.body.addEventListener('animationend', e => {
            if (e.animationName === 'screen-shake') document.body.classList.remove('shake');
        });
    })();

    // completionist achievement
    (function () {
        const footer = $('.footer');
        if (!footer || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    achieve('end', '🏁 Certified Completionist — you saw it all.');
                    io.disconnect();
                }
            });
        }, { threshold: 0.4 });
        io.observe(footer);
    })();

    /* ============================================================
       MISC — year, tab title, console
       ============================================================ */
    (function () {
        const year = $('#year');
        if (year) year.textContent = new Date().getFullYear();

        const realTitle = document.title;
        document.addEventListener('visibilitychange', () => {
            document.title = document.hidden ? '👀 hey, come back!' : realTitle;
        });

        console.log(
            '%c👋 hey, dev-tools person!',
            'font-family:monospace;font-size:18px;font-weight:bold;color:#FF6B35;'
        );
        console.log(
            '%cIf you’re poking around in here, we’d probably get along.\n' +
            '→ github.com/ResonanceHybrid\n' +
            'P.S. try the Konami code on the page. ↑↑↓↓←→←→BA',
            'font-family:monospace;font-size:12px;color:#4D96FF;'
        );
    })();

})();
