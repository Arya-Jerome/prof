/* ============================================
   DASHBOARD INFO — Tag inputs, dynamic entries,
   Supabase data fetch & save
   ============================================ */

(function () {
    'use strict';
    if (window.__dashboardInfoInit) return;
    window.__dashboardInfoInit = true;

    // ── Supabase config (injected by Django template) ──
    const SUPABASE_URL = window.SUPABASE_URL || '';
    const SUPABASE_KEY = window.SUPABASE_KEY || '';
    const USER_ID = window.USER_ID || '';

    // ── TAG INPUT ──────────────────────────────────────

    /**
     * Initialise a tag input widget.
     * @param {HTMLElement} wrapper   - .tag-input-wrapper
     * @param {HTMLInputElement} textInput - the visible text field
     * @param {HTMLInputElement} hidden    - the hidden field that stores JSON array
     */
    function initTagInput(wrapper, textInput, hidden) {
        const tagList = wrapper.querySelector('.tag-list');
        let tags = [];

        function renderTags() {
            tagList.querySelectorAll('.tag-item').forEach(el => el.remove());
            tags.forEach(function (tag, idx) {
                const item = document.createElement('span');
                item.className = 'tag-item';
                item.setAttribute('role', 'listitem');

                const text = document.createElement('span');
                text.className = 'tag-item__text';
                text.textContent = tag;

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'tag-item__remove';
                removeBtn.setAttribute('aria-label', 'Remove ' + tag);
                removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                removeBtn.addEventListener('click', function () {
                    tags.splice(idx, 1);
                    renderTags();
                    syncHidden();
                });

                item.appendChild(text);
                item.appendChild(removeBtn);
                tagList.appendChild(item);
            });
        }

        function addTag(value) {
            const trimmed = value.trim().replace(/,+$/, '');
            if (!trimmed || tags.includes(trimmed)) return;
            tags.push(trimmed);
            renderTags();
            syncHidden();
        }

        function syncHidden() {
            hidden.value = JSON.stringify(tags);
        }

        function setTags(arr) {
            tags = Array.isArray(arr) ? arr.slice() : [];
            renderTags();
            syncHidden();
        }

        wrapper.addEventListener('click', function () {
            textInput.focus();
        });

        textInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(textInput.value);
                textInput.value = '';
            } else if (e.key === 'Backspace' && textInput.value === '' && tags.length > 0) {
                tags.pop();
                renderTags();
                syncHidden();
            }
        });

        textInput.addEventListener('blur', function () {
            if (textInput.value.trim()) {
                addTag(textInput.value);
                textInput.value = '';
            }
        });

        // Expose for programmatic population
        wrapper._setTags = setTags;
        wrapper._getTags = function () { return tags.slice(); };
    }

    // ── INIT static tag inputs (skills + blocked fields) ──

    function initStaticTagInput(wrapperId, inputId, hiddenId) {
        const wrapper = document.getElementById(wrapperId);
        const input = document.getElementById(inputId);
        const hidden = document.getElementById(hiddenId);
        if (wrapper && input && hidden) {
            initTagInput(wrapper, input, hidden);
        }
        return wrapper;
    }

    const skillsWrapper = initStaticTagInput('skills-tag-wrapper', 'skills-input', 'skills-hidden');
    const blockedIndustriesWrapper = initStaticTagInput('blocked-industries-tag-wrapper', 'blocked-industries-input', 'blocked-industries-hidden');
    const workStyleWrapper = initStaticTagInput('work-style-tag-wrapper', 'work-style-input', 'work-style-hidden');
    const blockedCompaniesWrapper = initStaticTagInput('blocked-companies-tag-wrapper', 'blocked-companies-input', 'blocked-companies-hidden');
    const blockedTitlesWrapper = initStaticTagInput('blocked-titles-tag-wrapper', 'blocked-titles-input', 'blocked-titles-hidden');
    const blockedDetailsWrapper = initStaticTagInput('blocked-details-tag-wrapper', 'blocked-details-input', 'blocked-details-hidden');

    // ── DYNAMIC ENTRY CARDS ────────────────────────────

    function addEntryCard(containerId, templateId, labelText) {
        const container = document.getElementById(containerId);
        const template = document.getElementById(templateId);
        if (!container || !template) return;

        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.entry-card');

        // Update label count
        const label = card.querySelector('.entry-card__label');
        if (label) label.textContent = labelText + ' ' + (container.children.length + 1);

        // Wire remove button
        const removeBtn = card.querySelector('.entry-card__remove');
        removeBtn.addEventListener('click', function () {
            card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-4px)';
            setTimeout(function () {
                card.remove();
                renumberEntries(container, labelText);
            }, 200);
        });

        // Wire degree searchable dropdown if present
        const degDd = card.querySelector('.deg-dropdown');
        if (degDd) initDegDropdown(degDd);
        if (actWrapper) {
            const actInput = actWrapper.querySelector('.tag-input');
            const actHidden = actWrapper.querySelector('input[type="hidden"]');
            initTagInput(actWrapper, actInput, actHidden);
        }

        // Wire bullets tag inputs inside experience cards
        const bulletsWrapper = card.querySelector('.exp-bullets-wrapper');
        if (bulletsWrapper) {
            const bulletsInput = bulletsWrapper.querySelector('.tag-input');
            const bulletsHidden = bulletsWrapper.querySelector('input[type="hidden"]');
            initTagInput(bulletsWrapper, bulletsInput, bulletsHidden);
        }

        container.appendChild(card);

        // Animate in
        card.style.opacity = '0';
        card.style.transform = 'translateY(8px)';
        card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        requestAnimationFrame(function () {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }

    function renumberEntries(container, labelText) {
        Array.from(container.children).forEach(function (card, idx) {
            const label = card.querySelector('.entry-card__label');
            if (label) label.textContent = labelText + ' ' + (idx + 1);
        });
    }

    document.getElementById('addEducationBtn')?.addEventListener('click', function () {
        addEntryCard('educationEntries', 'education-entry-template', 'Degree');
    });

    document.getElementById('addCertificationBtn')?.addEventListener('click', function () {
        addEntryCard('certificationEntries', 'certification-entry-template', 'Certification');
    });

    document.getElementById('addExperienceBtn')?.addEventListener('click', function () {
        addEntryCard('experienceEntries', 'experience-entry-template', 'Experience');
    });

        // ── DATE FORMAT NORMALIZER ─────────────────────────
    /**
     * Converts any date-like string to "YYYY-MM" for <input type="month">.
     * Handles:
     *   "20240501"       → "2024-05"
     *   "20251202"       → "2025-12"
     *   "2025"           → "2025-01"  (year-only → Jan of that year)
     *   "2025-12"        → "2025-12"  (already correct)
     *   "2025-12-02"     → "2025-12"
     *   "Dec 2025"       → "2025-12"
     *   "March 2026"     → "2026-03"
     *   "Mar 2026"       → "2026-03"
     *   "2026-03-15T..." → "2026-03"  (ISO datetime)
     *   null / ""        → ""
     */
    var MONTH_MAP = {
        jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
        jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
        january:'01', february:'02', march:'03', april:'04', june:'06',
        july:'07', august:'08', september:'09', october:'10', november:'11', december:'12'
    };

    function toMonthInput(raw) {
        if (raw == null) return '';
        var s = String(raw).trim();
        if (!s) return '';

        // ISO datetime: "2026-03-15T..."
        if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.substring(0, 7);

        // Already YYYY-MM
        if (/^\d{4}-\d{2}$/.test(s)) return s;

        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.substring(0, 7);

        // YYYYMMDD (8 digits)
        if (/^\d{8}$/.test(s)) return s.substring(0, 4) + '-' + s.substring(4, 6);

        // YYYYMM (6 digits)
        if (/^\d{6}$/.test(s)) return s.substring(0, 4) + '-' + s.substring(4, 6);

        // Year only: "2025" → "2025-01"
        if (/^\d{4}$/.test(s)) return s + '-01';

        // "Mon YYYY" or "Month YYYY" e.g. "Mar 2026", "March 2026"
        var monYear = s.match(/^([a-zA-Z]+)\s+(\d{4})$/);
        if (monYear) {
            var mm = MONTH_MAP[monYear[1].toLowerCase()];
            if (mm) return monYear[2] + '-' + mm;
        }

        // "YYYY Mon" or "YYYY Month" e.g. "2026 Mar"
        var yearMon = s.match(/^(\d{4})\s+([a-zA-Z]+)$/);
        if (yearMon) {
            var mm2 = MONTH_MAP[yearMon[2].toLowerCase()];
            if (mm2) return yearMon[1] + '-' + mm2;
        }

        // Fallback: try native Date parse, extract YYYY-MM
        var d = new Date(s);
        if (!isNaN(d.getTime())) {
            var y = d.getFullYear();
            var m = String(d.getMonth() + 1).padStart(2, '0');
            return y + '-' + m;
        }

        return ''; // unrecognised — leave blank
    }

    /**
     * Converts any date-like string to a 4-digit year string for
     * <input type="number"> year fields.
     * "2026"        → "2026"
     * "2026-03"     → "2026"
     * "20260315"    → "2026"
     * "Mar 2026"    → "2026"
     */
    function toYearInput(raw) {
        if (raw == null) return '';
        var s = String(raw).trim();
        if (!s) return '';
        // plain 4-digit year
        if (/^\d{4}$/.test(s)) return s;
        // starts with 4 digits followed by separator
        var m = s.match(/^(\d{4})[\-\/\s]/);
        if (m) return m[1];
        // 8-digit compact
        if (/^\d{8}$/.test(s)) return s.substring(0, 4);
        // "Mon YYYY"
        var monYear = s.match(/^[a-zA-Z]+\s+(\d{4})$/);
        if (monYear) return monYear[1];
        return '';
    }

    // ── DEGREE SEARCHABLE DROPDOWN ─────────────────────

    /**
     * Initialises one .deg-dropdown widget.
     * Exposes:
     *   widget.getValue()   → current string value
     *   widget.setValue(v)  → programmatically select/set a value
     */
    function initDegDropdown(root) {
        if (!root || root._degInit) return;
        root._degInit = true;

        var trigger   = root.querySelector('.deg-dropdown__trigger');
        var menu      = root.querySelector('.deg-dropdown__menu');
        var search    = root.querySelector('.deg-dropdown__search');
        var list      = root.querySelector('.deg-dropdown__list');
        var empty     = root.querySelector('.deg-dropdown__empty');
        var customBtn = root.querySelector('.deg-dropdown__custom-btn');
        var customLbl = root.querySelector('.deg-dropdown__custom-label');
        var hidden    = root.querySelector('.deg-dropdown__hidden');
        var textSpan  = root.querySelector('.deg-dropdown__text');

        function open() {
            menu.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
            search.value = '';
            filterItems('');
            setTimeout(function() { search.focus(); }, 60);
            // close others
            document.querySelectorAll('.deg-dropdown__menu.is-open').forEach(function(m) {
                if (m !== menu) {
                    var r = m.closest('.deg-dropdown');
                    if (r) close_dd(r);
                }
            });
        }

        function close_dd(r) {
            r = r || root;
            var m = r.querySelector('.deg-dropdown__menu');
            var t = r.querySelector('.deg-dropdown__trigger');
            if (m) m.classList.remove('is-open');
            if (t) t.setAttribute('aria-expanded', 'false');
        }

        function isOpen() {
            return menu.classList.contains('is-open');
        }

        function select(value, label) {
            hidden.value = value;
            textSpan.textContent = label || value;
            textSpan.classList.remove('deg-dropdown__text--placeholder');
            list.querySelectorAll('.deg-dropdown__item').forEach(function(it) {
                it.classList.toggle('is-selected', it.getAttribute('data-value') === value);
            });
            close_dd();
        }

        function filterItems(q) {
            var query = q.toLowerCase().trim();
            var visible = 0;
            list.querySelectorAll('.deg-dropdown__item').forEach(function(it) {
                var text = (it.getAttribute('data-value') + ' ' + it.textContent).toLowerCase();
                var show = !query || text.includes(query);
                it.classList.toggle('is-hidden', !show);
                if (show) visible++;
            });
            // Show/hide group labels — hide if all items below them are hidden
            list.querySelectorAll('.deg-dropdown__group-label').forEach(function(gl) {
                var next = gl.nextElementSibling;
                var anyVisible = false;
                while (next && !next.classList.contains('deg-dropdown__group-label')) {
                    if (!next.classList.contains('is-hidden')) anyVisible = true;
                    next = next.nextElementSibling;
                }
                gl.style.display = anyVisible ? '' : 'none';
            });
            empty.classList.toggle('is-visible', visible === 0);
            // Custom button: show when query has text and no exact match
            if (q.trim()) {
                var exact = Array.from(list.querySelectorAll('.deg-dropdown__item')).some(function(it) {
                    return it.getAttribute('data-value').toLowerCase() === q.toLowerCase().trim();
                });
                customBtn.classList.toggle('is-visible', !exact);
                if (customLbl) customLbl.textContent = 'Add "' + q.trim() + '"';
            } else {
                customBtn.classList.remove('is-visible');
            }
        }

        // setValue: called programmatically during data load
        function setValue(rawValue) {
            if (rawValue == null || rawValue === '') return;
            var match = Array.from(list.querySelectorAll('.deg-dropdown__item')).find(function(it) {
                return it.getAttribute('data-value').toLowerCase() === rawValue.toLowerCase();
            });
            if (match) {
                select(match.getAttribute('data-value'), match.getAttribute('data-value'));
            } else {
                // Unknown value — add it dynamically as a new item and select it
                var newItem = document.createElement('div');
                newItem.className = 'deg-dropdown__item';
                newItem.setAttribute('data-value', rawValue);
                newItem.setAttribute('role', 'option');
                newItem.textContent = rawValue;
                // Append before the empty message
                list.appendChild(newItem);
                newItem.addEventListener('click', function() {
                    select(rawValue, rawValue);
                });
                select(rawValue, rawValue);
            }
        }

        // Events
        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            isOpen() ? close_dd() : open();
        });

        search.addEventListener('click', function(e) { e.stopPropagation(); });

        search.addEventListener('input', function() {
            filterItems(search.value);
        });

        search.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var q = search.value.trim();
                if (!q) return;
                // If exactly one item visible, select it; else treat as custom
                var visible = Array.from(list.querySelectorAll('.deg-dropdown__item:not(.is-hidden)'));
                if (visible.length === 1) {
                    select(visible[0].getAttribute('data-value'), visible[0].getAttribute('data-value'));
                } else {
                    setValue(q); // add as custom
                }
            } else if (e.key === 'Escape') {
                close_dd();
            }
        });

        list.addEventListener('click', function(e) {
            var item = e.target.closest('.deg-dropdown__item');
            if (!item) return;
            select(item.getAttribute('data-value'), item.getAttribute('data-value'));
        });

        customBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var q = search.value.trim();
            if (q) setValue(q);
        });

        document.addEventListener('click', function(e) {
            if (!root.contains(e.target)) close_dd();
        });

        // Expose API
        root._degSetValue = setValue;
        root._degGetValue = function() { return hidden.value; };
    }

    /**
     * Called during data load — sets the degree dropdown value on a card.
     * Replaces the old setSelectOrCustom.
     */
    function setDegreeValue(card, rawValue) {
        var dd = card.querySelector('.deg-dropdown');
        if (dd && dd._degSetValue) {
            dd._degSetValue(rawValue);
        }
    }

    // ── DJANGO API HELPERS ─────────────────────────────

    function getCsrfToken() {
        const el = document.querySelector('[name=csrfmiddlewaretoken]');
        return el ? el.value : '';
    }

    async function apiFetch(url, method, body) {
        const opts = {
            method: method || 'GET',
            headers: { 'X-CSRFToken': getCsrfToken(), 'Content-Type': 'application/json' },
            credentials: 'same-origin',
        };
        if (body) opts.body = JSON.stringify(body);
        const resp = await fetch(url, opts);
        if (!resp.ok) throw new Error('API error ' + resp.status);
        return resp.status === 204 ? null : resp.json();
    }

    // ── SKELETON HELPERS ───────────────────────────────

    function showSectionSkeletons() {
        const skeletonHTML = `
            <div class="skeleton-block" aria-hidden="true">
                <div class="skeleton-line skeleton-line--wide"></div>
                <div class="skeleton-line skeleton-line--medium"></div>
                <div class="skeleton-line skeleton-line--short"></div>
            </div>`;
        ['educationEntries','certificationEntries','experienceEntries'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = skeletonHTML;
        });
        ['skills-tags','blocked-industries-tags','work-style-tags',
         'blocked-companies-tags','blocked-titles-tags','blocked-details-tags'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) { el.innerHTML = skeletonHTML; }
        });
    }

    function clearSectionSkeletons() {
        document.querySelectorAll('.skeleton-block').forEach(function(el) { el.remove(); });
    }

    function showLoadError() {
        const banner = document.createElement('div');
        banner.className = 'info-load-error';
        banner.setAttribute('role', 'alert');
        banner.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
            + ' Could not load your saved data. <button type="button" id="retryLoadBtn">Retry</button>';
        const form = document.getElementById('infoForm');
        if (form) form.prepend(banner);
        document.getElementById('retryLoadBtn')?.addEventListener('click', function() {
            banner.remove();
            loadUserInfo();
        });
    }

    // ── LOAD DATA (with client-side retry + skeleton UX) ───

    async function loadUserInfo() {
        showSectionSkeletons();
        const MAX_RETRIES = 3;
        const BACKOFF_BASE = 800; // ms

        async function attempt(n) {
            try {
                const data = await apiFetch('/dashboard/api/user-info/');
                return data;
            } catch (err) {
                if (n < MAX_RETRIES) {
                    const delay = BACKOFF_BASE * Math.pow(2, n - 1) + Math.random() * 300;
                    console.warn('loadUserInfo attempt ' + n + ' failed, retrying in ' + Math.round(delay) + 'ms…', err);
                    await new Promise(function(res) { setTimeout(res, delay); });
                    return attempt(n + 1);
                }
                throw err;
            }
        }

        try {
            const data = await attempt(1);
            clearSectionSkeletons();
            if (!data || Object.keys(data).length === 0) return;

            setValue('field-name', data.name);
            setValue('field-phone', data.phone);
            setValue('field-linkedin', data.linkedin);
            setValue('field-website', data.website);
            setValue('field-location', data.location);

            if (skillsWrapper && Array.isArray(data.skills)) {
                skillsWrapper._setTags(data.skills);
            }

            if (Array.isArray(data.education)) {
                data.education.forEach(function (edu) {
                    addEntryCard('educationEntries', 'education-entry-template', 'Degree');
                    const cards = document.querySelectorAll('#educationEntries .entry-card');
                    const card = cards[cards.length - 1];
                    // Use the searchable dropdown — adds unknown values dynamically
                    setDegreeValue(card, edu.degree || null);
                    setCardField(card, 'edu_major[]', edu.major);
                    setCardField(card, 'edu_institution[]', edu.institution);
                    // start_year / end_year: normalize to plain year string
                    setCardField(card, 'edu_start_year[]', toYearInput(edu.start_year));
                    setCardField(card, 'edu_end_year[]', toYearInput(edu.end_year));
                    setCardField(card, 'edu_gpa[]', edu.gpa != null ? edu.gpa : '');
                    setCardField(card, 'edu_honors[]', edu.honors);
                    const actWrapper = card.querySelector('.edu-activities-wrapper');
                    if (actWrapper && Array.isArray(edu.activities)) actWrapper._setTags(edu.activities);
                });
            }

            if (Array.isArray(data.certifications)) {
                data.certifications.forEach(function (cert) {
                    addEntryCard('certificationEntries', 'certification-entry-template', 'Certification');
                    const cards = document.querySelectorAll('#certificationEntries .entry-card');
                    const card = cards[cards.length - 1];
                    // Support both key variants: certification_name or name
                    setCardField(card, 'cert_name[]', cert.certification_name || cert.name || null);
                    // Support both key variants: organization or issuer
                    setCardField(card, 'cert_issuer[]', cert.organization || cert.issuer || null);
                    // Normalize any date format to YYYY-MM for <input type="month">
                    setCardField(card, 'cert_issue_date[]', toMonthInput(cert.date || cert.issue_date || null));
                });
            }

            if (Array.isArray(data.experience)) {
                data.experience.forEach(function (exp) {
                    addEntryCard('experienceEntries', 'experience-entry-template', 'Experience');
                    const cards = document.querySelectorAll('#experienceEntries .entry-card');
                    const card = cards[cards.length - 1];
                    setCardField(card, 'exp_job_title[]', exp.job_title);
                    setCardField(card, 'exp_company[]', exp.company);
                    setCardField(card, 'exp_start_date[]', toMonthInput(exp.start_date));
                    setCardField(card, 'exp_end_date[]', toMonthInput(exp.end_date));
                    const bulletsWrapper = card.querySelector('.exp-bullets-wrapper');
                    if (bulletsWrapper && Array.isArray(exp.bullets)) bulletsWrapper._setTags(exp.bullets);
                });
            }

            if (blockedIndustriesWrapper && Array.isArray(data.blocked_industries)) blockedIndustriesWrapper._setTags(data.blocked_industries);
            if (workStyleWrapper && Array.isArray(data.work_style)) workStyleWrapper._setTags(data.work_style);
            if (blockedCompaniesWrapper && Array.isArray(data.blocked_companies)) blockedCompaniesWrapper._setTags(data.blocked_companies);
            if (blockedTitlesWrapper && Array.isArray(data.blocked_titles)) blockedTitlesWrapper._setTags(data.blocked_titles);
            if (blockedDetailsWrapper && Array.isArray(data.blocked_details)) blockedDetailsWrapper._setTags(data.blocked_details);

        } catch (err) {
            clearSectionSkeletons();
            console.error('Failed to load user info after retries:', err);
            showLoadError();
        }
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el && value != null) el.value = value;
    }

    function setCardField(card, name, value) {
        const el = card.querySelector('[name="' + name + '"]');
        if (el && value != null) el.value = value;
    }

    // ── COLLECT & SAVE ─────────────────────────────────

    function collectFormData() {
        function getAll(name) {
            return Array.from(document.querySelectorAll('[name="' + name + '"]')).map(function (el) { return el.value; });
        }
        function getTagsFrom(wrapper) { return wrapper ? wrapper._getTags() : []; }

        var education = getAll('edu_degree[]').map(function (_, i) {
            var actWrappers = document.querySelectorAll('.edu-activities-wrapper');
            return {
                degree:      getAll('edu_degree[]')[i] || '',
                major:       getAll('edu_major[]')[i] || '',
                institution: getAll('edu_institution[]')[i] || '',
                start_year:  getAll('edu_start_year[]')[i] || null,
                end_year:    getAll('edu_end_year[]')[i] || null,
                gpa:         getAll('edu_gpa[]')[i] || '',
                honors:      getAll('edu_honors[]')[i] || '',
                activities:  actWrappers[i] ? actWrappers[i]._getTags() : [],
            };
        });

        var certifications = getAll('cert_name[]').map(function (_, i) {
            return {
                name:       getAll('cert_name[]')[i] || '',
                issuer:     getAll('cert_issuer[]')[i] || '',
                issue_date: getAll('cert_issue_date[]')[i] || null,
            };
        });

        var bulletsWrappers = document.querySelectorAll('.exp-bullets-wrapper');
        var experience = getAll('exp_job_title[]').map(function (_, i) {
            return {
                job_title:  getAll('exp_job_title[]')[i] || '',
                company:    getAll('exp_company[]')[i] || '',
                start_date: getAll('exp_start_date[]')[i] || null,
                end_date:   getAll('exp_end_date[]')[i] || null,
                bullets:    bulletsWrappers[i] ? bulletsWrappers[i]._getTags() : [],
            };
        });

        // Flat structure matching real table columns
        return {
            name:               document.getElementById('field-name')?.value || '',
            phone:              document.getElementById('field-phone')?.value || '',
            linkedin:           document.getElementById('field-linkedin')?.value || '',
            website:            document.getElementById('field-website')?.value || '',
            location:           document.getElementById('field-location')?.value || '',
            skills:             getTagsFrom(skillsWrapper),
            education:          education,
            certifications:     certifications,
            experience:         experience,
            // Blocked fields as flat top-level keys
            blocked_industries: getTagsFrom(blockedIndustriesWrapper),
            work_style:         getTagsFrom(workStyleWrapper),
            blocked_companies:  getTagsFrom(blockedCompaniesWrapper),
            blocked_titles:     getTagsFrom(blockedTitlesWrapper),
            blocked_details:    getTagsFrom(blockedDetailsWrapper),
        };
    }

    document.getElementById('infoForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        var saveBtn = document.getElementById('saveInfoBtn');
        var originalHTML = saveBtn.innerHTML;

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Saving\u2026';

        try {
            await apiFetch('/dashboard/api/user-info/save/', 'POST', collectFormData());
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Saved!';
            setTimeout(function () { saveBtn.innerHTML = originalHTML; saveBtn.disabled = false; }, 2000);
        } catch (err) {
            console.error('Save failed:', err);
            saveBtn.innerHTML = 'Save failed \u2014 retry';
            saveBtn.disabled = false;
            setTimeout(function () { saveBtn.innerHTML = originalHTML; }, 3000);
        }
    });

    // ── INIT ───────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', loadUserInfo);

})();/* ============================================
   DASHBOARD INFO — Tag inputs, dynamic entries,
   Supabase data fetch & save
   ============================================ */

(function () {
    'use strict';

    // ── Supabase config (injected by Django template) ──
    const SUPABASE_URL = window.SUPABASE_URL || '';
    const SUPABASE_KEY = window.SUPABASE_KEY || '';
    const USER_ID = window.USER_ID || '';

    // ── TAG INPUT ──────────────────────────────────────

    /**
     * Initialise a tag input widget.
     * @param {HTMLElement} wrapper   - .tag-input-wrapper
     * @param {HTMLInputElement} textInput - the visible text field
     * @param {HTMLInputElement} hidden    - the hidden field that stores JSON array
     */
    function initTagInput(wrapper, textInput, hidden) {
        const tagList = wrapper.querySelector('.tag-list');
        let tags = [];

        function renderTags() {
            tagList.querySelectorAll('.tag-item').forEach(el => el.remove());
            tags.forEach(function (tag, idx) {
                const item = document.createElement('span');
                item.className = 'tag-item';
                item.setAttribute('role', 'listitem');

                const text = document.createElement('span');
                text.className = 'tag-item__text';
                text.textContent = tag;

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'tag-item__remove';
                removeBtn.setAttribute('aria-label', 'Remove ' + tag);
                removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                removeBtn.addEventListener('click', function () {
                    tags.splice(idx, 1);
                    renderTags();
                    syncHidden();
                });

                item.appendChild(text);
                item.appendChild(removeBtn);
                tagList.appendChild(item);
            });
        }

        function addTag(value) {
            const trimmed = value.trim().replace(/,+$/, '');
            if (!trimmed || tags.includes(trimmed)) return;
            tags.push(trimmed);
            renderTags();
            syncHidden();
        }

        function syncHidden() {
            hidden.value = JSON.stringify(tags);
        }

        function setTags(arr) {
            tags = Array.isArray(arr) ? arr.slice() : [];
            renderTags();
            syncHidden();
        }

        wrapper.addEventListener('click', function () {
            textInput.focus();
        });

        textInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(textInput.value);
                textInput.value = '';
            } else if (e.key === 'Backspace' && textInput.value === '' && tags.length > 0) {
                tags.pop();
                renderTags();
                syncHidden();
            }
        });

        textInput.addEventListener('blur', function () {
            if (textInput.value.trim()) {
                addTag(textInput.value);
                textInput.value = '';
            }
        });

        // Expose for programmatic population
        wrapper._setTags = setTags;
        wrapper._getTags = function () { return tags.slice(); };
    }

    // ── INIT static tag inputs (skills + blocked fields) ──

    function initStaticTagInput(wrapperId, inputId, hiddenId) {
        const wrapper = document.getElementById(wrapperId);
        const input = document.getElementById(inputId);
        const hidden = document.getElementById(hiddenId);
        if (wrapper && input && hidden) {
            initTagInput(wrapper, input, hidden);
        }
        return wrapper;
    }

    const skillsWrapper = initStaticTagInput('skills-tag-wrapper', 'skills-input', 'skills-hidden');
    const blockedIndustriesWrapper = initStaticTagInput('blocked-industries-tag-wrapper', 'blocked-industries-input', 'blocked-industries-hidden');
    const workStyleWrapper = initStaticTagInput('work-style-tag-wrapper', 'work-style-input', 'work-style-hidden');
    const blockedCompaniesWrapper = initStaticTagInput('blocked-companies-tag-wrapper', 'blocked-companies-input', 'blocked-companies-hidden');
    const blockedTitlesWrapper = initStaticTagInput('blocked-titles-tag-wrapper', 'blocked-titles-input', 'blocked-titles-hidden');
    const blockedDetailsWrapper = initStaticTagInput('blocked-details-tag-wrapper', 'blocked-details-input', 'blocked-details-hidden');

    // ── DYNAMIC ENTRY CARDS ────────────────────────────

    function addEntryCard(containerId, templateId, labelText) {
        const container = document.getElementById(containerId);
        const template = document.getElementById(templateId);
        if (!container || !template) return;

        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.entry-card');

        // Update label count
        const label = card.querySelector('.entry-card__label');
        if (label) label.textContent = labelText + ' ' + (container.children.length + 1);

        // Wire remove button
        const removeBtn = card.querySelector('.entry-card__remove');
        removeBtn.addEventListener('click', function () {
            card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-4px)';
            setTimeout(function () {
                card.remove();
                renumberEntries(container, labelText);
            }, 200);
        });

        // Wire degree searchable dropdown if present
        const degDd = card.querySelector('.deg-dropdown');
        if (degDd) initDegDropdown(degDd);
        if (actWrapper) {
            const actInput = actWrapper.querySelector('.tag-input');
            const actHidden = actWrapper.querySelector('input[type="hidden"]');
            initTagInput(actWrapper, actInput, actHidden);
        }

        container.appendChild(card);

        // Animate in
        card.style.opacity = '0';
        card.style.transform = 'translateY(8px)';
        card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        requestAnimationFrame(function () {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }

    function renumberEntries(container, labelText) {
        Array.from(container.children).forEach(function (card, idx) {
            const label = card.querySelector('.entry-card__label');
            if (label) label.textContent = labelText + ' ' + (idx + 1);
        });
    }

    document.getElementById('addEducationBtn')?.addEventListener('click', function () {
        addEntryCard('educationEntries', 'education-entry-template', 'Degree');
    });

    document.getElementById('addCertificationBtn')?.addEventListener('click', function () {
        addEntryCard('certificationEntries', 'certification-entry-template', 'Certification');
    });

    document.getElementById('addExperienceBtn')?.addEventListener('click', function () {
        addEntryCard('experienceEntries', 'experience-entry-template', 'Experience');
    });

    // ── SUPABASE HELPERS ───────────────────────────────

    async function supabaseFetch(path, method, body) {
        const resp = await fetch(SUPABASE_URL + path, {
            method: method || 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : '',
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!resp.ok) throw new Error('Supabase error ' + resp.status);
        return resp.status === 204 ? null : resp.json();
    }

    // ── LOAD DATA FROM SUPABASE ────────────────────────

    async function loadUserInfo() {
        if (!SUPABASE_URL || !USER_ID) return;
        try {
            const rows = await supabaseFetch(
                '/rest/v1/user_info?user_id=eq.' + encodeURIComponent(USER_ID) + '&limit=1'
            );
            if (!rows || rows.length === 0) return;
            const data = rows[0];

            // Personal
            setValue('field-name', data.name);
            setValue('field-phone', data.phone);
            setValue('field-linkedin', data.linkedin);
            setValue('field-website', data.website);
            setValue('field-location', data.location);

            // Skills
            if (skillsWrapper && Array.isArray(data.skills)) {
                skillsWrapper._setTags(data.skills);
            }

            // Education
            if (Array.isArray(data.education)) {
                data.education.forEach(function (edu) {
                    addEntryCard('educationEntries', 'education-entry-template', 'Degree');
                    const cards = document.querySelectorAll('#educationEntries .entry-card');
                    const card = cards[cards.length - 1];
                    setCardField(card, 'edu_degree[]', edu.degree);
                    setCardField(card, 'edu_major[]', edu.major);
                    setCardField(card, 'edu_institution[]', edu.institution);
                    setCardField(card, 'edu_start_year[]', edu.start_year);
                    setCardField(card, 'edu_end_year[]', edu.end_year);
                    setCardField(card, 'edu_gpa[]', edu.gpa);
                    setCardField(card, 'edu_honors[]', edu.honors);
                    const actWrapper = card.querySelector('.edu-activities-wrapper');
                    if (actWrapper && Array.isArray(edu.activities)) {
                        actWrapper._setTags(edu.activities);
                    }
                });
            }

            // Certifications
            if (Array.isArray(data.certifications)) {
                data.certifications.forEach(function (cert) {
                    addEntryCard('certificationEntries', 'certification-entry-template', 'Certification');
                    const cards = document.querySelectorAll('#certificationEntries .entry-card');
                    const card = cards[cards.length - 1];
                    // Support both key variants: certification_name or name
                    setCardField(card, 'cert_name[]', cert.certification_name || cert.name || null);
                    // Support both key variants: organization or issuer
                    setCardField(card, 'cert_issuer[]', cert.organization || cert.issuer || null);
                    // Normalize any date format to YYYY-MM for <input type="month">
                    setCardField(card, 'cert_issue_date[]', toMonthInput(cert.date || cert.issue_date || null));
                });
            }

            // Experience
            if (Array.isArray(data.experience)) {
                data.experience.forEach(function (exp) {
                    addEntryCard('experienceEntries', 'experience-entry-template', 'Experience');
                    const cards = document.querySelectorAll('#experienceEntries .entry-card');
                    const card = cards[cards.length - 1];
                    setCardField(card, 'exp_title[]', exp.title);
                    setCardField(card, 'exp_company[]', exp.company);
                    setCardField(card, 'exp_location[]', exp.location);
                    setCardField(card, 'exp_type[]', exp.type);
                    setCardField(card, 'exp_start_date[]', toMonthInput(exp.start_date));
                    setCardField(card, 'exp_end_date[]', toMonthInput(exp.end_date));
                    setCardField(card, 'exp_description[]', exp.description);
                });
            }

            // Blocked
            const blocked = data.blocked || {};
            if (blockedIndustriesWrapper && Array.isArray(blocked.blocked_industries)) blockedIndustriesWrapper._setTags(blocked.blocked_industries);
            if (workStyleWrapper && Array.isArray(blocked.work_style)) workStyleWrapper._setTags(blocked.work_style);
            if (blockedCompaniesWrapper && Array.isArray(blocked.blocked_companies)) blockedCompaniesWrapper._setTags(blocked.blocked_companies);
            if (blockedTitlesWrapper && Array.isArray(blocked.blocked_titles)) blockedTitlesWrapper._setTags(blocked.blocked_titles);
            if (blockedDetailsWrapper && Array.isArray(blocked.blocked_details)) blockedDetailsWrapper._setTags(blocked.blocked_details);

        } catch (err) {
            console.error('Failed to load user info:', err);
        }
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el && value != null) el.value = value;
    }

    function setCardField(card, name, value) {
        const el = card.querySelector('[name="' + name + '"]');
        if (el && value != null) el.value = value;
    }

    // ── COLLECT & SAVE ─────────────────────────────────

    function collectFormData() {
        function getAll(name) {
            return Array.from(document.querySelectorAll('[name="' + name + '"]')).map(el => el.value);
        }

        function getTagsFrom(wrapper) {
            return wrapper ? wrapper._getTags() : [];
        }

        const education = getAll('edu_degree[]').map(function (_, i) {
            const actWrappers = document.querySelectorAll('.edu-activities-wrapper');
            return {
                degree: getAll('edu_degree[]')[i] || '',
                major: getAll('edu_major[]')[i] || '',
                institution: getAll('edu_institution[]')[i] || '',
                start_year: getAll('edu_start_year[]')[i] || null,
                end_year: getAll('edu_end_year[]')[i] || null,
                gpa: getAll('edu_gpa[]')[i] || '',
                honors: getAll('edu_honors[]')[i] || '',
                activities: actWrappers[i] ? actWrappers[i]._getTags() : [],
            };
        });

        const certifications = getAll('cert_name[]').map(function (_, i) {
            return {
                name: getAll('cert_name[]')[i] || '',
                issuer: getAll('cert_issuer[]')[i] || '',
                issue_date: getAll('cert_issue_date[]')[i] || null,
                expiry_date: getAll('cert_expiry_date[]')[i] || null,
                credential_id: getAll('cert_credential_id[]')[i] || '',
            };
        });

        const experience = getAll('exp_title[]').map(function (_, i) {
            return {
                title: getAll('exp_title[]')[i] || '',
                company: getAll('exp_company[]')[i] || '',
                location: getAll('exp_location[]')[i] || '',
                type: getAll('exp_type[]')[i] || '',
                start_date: getAll('exp_start_date[]')[i] || null,
                end_date: getAll('exp_end_date[]')[i] || null,
                description: getAll('exp_description[]')[i] || '',
            };
        });

        return {
            user_id: USER_ID,
            name: document.getElementById('field-name')?.value || '',
            phone: document.getElementById('field-phone')?.value || '',
            linkedin: document.getElementById('field-linkedin')?.value || '',
            website: document.getElementById('field-website')?.value || '',
            location: document.getElementById('field-location')?.value || '',
            skills: getTagsFrom(skillsWrapper),
            education: education,
            certifications: certifications,
            experience: experience,
            blocked: {
                blocked_industries: getTagsFrom(blockedIndustriesWrapper),
                work_style: getTagsFrom(workStyleWrapper),
                blocked_companies: getTagsFrom(blockedCompaniesWrapper),
                blocked_titles: getTagsFrom(blockedTitlesWrapper),
                blocked_details: getTagsFrom(blockedDetailsWrapper),
            },
        };
    }

    document.getElementById('infoForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const saveBtn = document.getElementById('saveInfoBtn');
        const originalText = saveBtn.innerHTML;

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Saving…';

        try {
            const payload = collectFormData();
            await supabaseFetch('/rest/v1/user_info', 'POST', payload);
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Saved!';
            setTimeout(function () {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }, 2000);
        } catch (err) {
            console.error('Save failed:', err);
            saveBtn.innerHTML = 'Save failed — retry';
            saveBtn.disabled = false;
            setTimeout(function () {
                saveBtn.innerHTML = originalText;
            }, 3000);
        }
    });

    // ── INIT ───────────────────────────────────────────
    loadUserInfo();

})();
