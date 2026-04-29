// ===== Voice Commands via Web Speech API =====
// Supports both Slovenian and English commands
// Uses SpeechRecognition for input and SpeechSynthesis for audio feedback

(function () {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceBtn = document.getElementById('btn-voice');
    const indicator = document.getElementById('voice-indicator');
    const voiceText = document.getElementById('voice-text');

    if (!SpeechRecognition) {
        console.warn('Web Speech API not supported in this browser');
        voiceBtn.title = 'Glasovni ukazi niso podprti v tem brskalniku (potreben Chrome/Edge)';
        voiceBtn.style.opacity = '0.4';
        voiceBtn.addEventListener('click', () => {
            showToast('Glasovni ukazi niso podprti v tem brskalniku. Uporabite Chrome ali Edge.', 'warning', 5000);
        });
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.lang = 'sl-SI';

    let isListening = false;

    // ===== Speech synthesis — voice selection =====
    // Voices load asynchronously; pick the best available Slovenian voice.
    // Fallback chain: sl → hr (Croatian) → sr (Serbian) → cs/sk → any.
    let selectedVoice = null;

    function pickVoice() {
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return;

        const priority = [
            v => /^sl\b/i.test(v.lang),           // Slovenian  (sl, sl-SI)
            v => /^hr\b/i.test(v.lang),           // Croatian   (closest relative)
            v => /^sr\b/i.test(v.lang),           // Serbian
            v => /^bs\b/i.test(v.lang),           // Bosnian
            v => /^(cs|sk)\b/i.test(v.lang),      // Czech / Slovak
            v => /^pl\b/i.test(v.lang),           // Polish
        ];

        for (const test of priority) {
            const match = voices.find(test);
            if (match) { selectedVoice = match; break; }
        }
    }

    // Voices may already be ready (Chrome desktop) or arrive via event (most others)
    pickVoice();
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice);

    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = 'sl-SI';
        if (selectedVoice) utt.voice = selectedVoice;
        utt.rate = 1.0;
        utt.pitch = 1;
        window.speechSynthesis.speak(utt);
    }

    // ===== Command definitions =====
    const commands = [
        {
            patterns: [/tren(ing|inge|i)/i, /workout/i, /fitnes/i],
            handler() { switchTab('workouts'); },
            response: 'Prikazujem treninge.'
        },
        {
            patterns: [/navad(e|o|a)?/i, /habit/i],
            handler() { switchTab('habits'); },
            response: 'Prikazujem navade.'
        },
        {
            patterns: [/obrok(e|i|a)?/i, /meal/i, /hrana/i, /jed(i)?/i],
            handler() { switchTab('meals'); },
            response: 'Prikazujem obroke.'
        },
        {
            patterns: [/uporabnik(e|i|a)?/i, /user/i],
            handler() { switchTab('users'); },
            response: 'Prikazujem uporabnike.'
        },
        {
            patterns: [/dodaj/i, /add new/i, /novo/i, /new/i],
            handler() { openNewForm(); },
            response: 'Odpiram formo za vnos.'
        },
        {
            patterns: [/osve[žz]i/i, /refresh/i, /nalož/i, /reload/i],
            handler() { loadCurrentTab(); },
            response: 'Osvežujem podatke.'
        },
        {
            patterns: [/zapri/i, /close/i, /preklič/i, /cancel/i],
            handler() { closeModal(); },
            response: 'Zapiram okno.'
        },
        {
            // "iskanje [term]" with a search term
            patterns: [/^(iskanje|išči|search)\s+(.+)/i],
            handler(match) {
                const term = match[2] || match[0].replace(/^(iskanje|išči|search)\s+/i, '');
                const inp = document.getElementById('search-input');
                inp.value = term;
                inp.dispatchEvent(new Event('input'));
                speak(`Iščem: ${term}`);
                showToast(`🎤 Iskanje: "${term}"`, 'info', 3000);
            },
            response: null  // handled inside handler
        },
        {
            // bare "iskanje" / "search" — just focus the box
            patterns: [/^(iskanje|išči|search)$/i],
            handler() { document.getElementById('search-input').focus(); },
            response: 'Aktiviram iskanje.'
        },
        {
            patterns: [/sinhroniziraj/i, /sync/i],
            handler() { document.getElementById('btn-sync').click(); },
            response: 'Sinhroniziram podatke.'
        },
        {
            patterns: [/pošlji obvestilo/i, /send notification/i, /send push/i],
            handler() { switchTab('push'); },
            response: 'Odpirám zavihek za push obvestila.'
        }
    ];

    // ===== Process transcript =====
    function processTranscript(transcript) {
        const text = transcript.trim().toLowerCase();
        voiceText.textContent = `"${transcript}"`;

        for (const cmd of commands) {
            for (const pattern of cmd.patterns) {
                const match = text.match(pattern);
                if (match) {
                    if (cmd.response) {
                        speak(cmd.response);
                        showToast(`🎤 "${transcript}" → ${cmd.response}`, 'info', 3000);
                    }
                    cmd.handler(match);
                    return;
                }
            }
        }

        speak('Ukaza nisem razumel. Prosim, ponovite.');
        showToast(`🎤 Neprepoznan ukaz: "${transcript}"`, 'warning', 3000);
    }

    // ===== 5-second countdown =====
    const LISTEN_SECONDS = 5;
    let countdownTimer = null;
    let secondsLeft = 0;
    let gotResult = false;

    function startCountdown() {
        secondsLeft = LISTEN_SECONDS;
        updateIndicator();
        clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
            secondsLeft--;
            updateIndicator();
            if (secondsLeft <= 0) {
                clearInterval(countdownTimer);
                countdownTimer = null;
                stopListening();
            }
        }, 1000);
    }

    function stopCountdown() {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    function updateIndicator() {
        voiceText.textContent = secondsLeft > 0 ? `Poslušam... ${secondsLeft}s` : 'Poslušam...';
    }

    // ===== Recognition events =====
    recognition.onresult = e => {
        gotResult = true;
        stopCountdown();
        const transcript = e.results[0][0].transcript;
        processTranscript(transcript);
    };

    recognition.onerror = e => {
        // 'no-speech' just means silence — restart if time remains
        if (e.error === 'no-speech' && isListening && secondsLeft > 0) return;

        const messages = {
            'audio-capture': 'Mikrofon ni dostopen.',
            'not-allowed': 'Dostop do mikrofona zavrnjen. Preverite dovoljenja v brskalniku.',
            'network': 'Napaka omrežja pri prepoznavanju govora.'
        };
        const msg = messages[e.error] || `Napaka: ${e.error}`;
        showToast(`🎤 ${msg}`, 'error');
        speak(msg);
        stopListening();
    };

    recognition.onend = () => {
        // If the 5-second window is still open and no result yet, restart recognition
        if (isListening && !gotResult && secondsLeft > 0) {
            try { recognition.start(); } catch {}
            return;
        }
        if (isListening) stopListening();
    };

    // ===== Start/stop =====
    function startListening() {
        if (isListening) {
            stopListening();
            return;
        }
        isListening = true;
        gotResult = false;
        voiceBtn.classList.add('active');
        indicator.classList.add('visible');

        startCountdown();

        try {
            recognition.start();
            speak('Poslušam ukaz.');
        } catch (err) {
            if (err.name !== 'InvalidStateError') {
                showToast(`🎤 Napaka pri zagonu: ${err.message}`, 'error');
                stopListening();
            }
        }
    }

    function stopListening() {
        isListening = false;
        gotResult = false;
        stopCountdown();
        voiceBtn.classList.remove('active');
        indicator.classList.remove('visible');
        try { recognition.stop(); } catch {}
    }

    // ===== Bind button =====
    voiceBtn.addEventListener('click', startListening);

    // ===== Keyboard shortcut Ctrl+M (handled only here, not in app.js) =====
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'm') {
            e.preventDefault();
            e.stopImmediatePropagation();   // prevent app.js from also firing .click()
            startListening();
        }
    });

    // ===== Expose for external calls =====
    window.voiceStartListening = startListening;
    window.voiceStopListening = stopListening;
})();
